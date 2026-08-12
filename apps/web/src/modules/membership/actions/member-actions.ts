'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  memberSchema,
  normalizeConjugeFields,
  type MemberFormValues,
  type MemberSituation,
} from '@vl6/shared';
import {
  createServerContainer,
  getAdminAuth,
  syncUserClaims,
  VercelBlobStorageAdapter,
  type ServerContainer,
} from '@vl6/infra';
import type { Member } from '@vl6/domain';
import { generateTemporaryPassword } from '@/lib/auth/generate-temporary-password';
import { requireSession } from '@/lib/auth/require-session';
import type { CurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { resolveProfissaoFromFormData } from '@/lib/membership/professions';

export interface MemberActionState {
  error: string | null;
  memberId: string | null;
  temporaryPassword: string | null;
}

const EMPTY_STATE: MemberActionState = { error: null, memberId: null, temporaryPassword: null };

const ALLOWED_PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

function validatePhotoFile(file: File): string | null {
  if (!(file.type in ALLOWED_PHOTO_TYPES)) {
    return 'Foto inválida: use JPG, PNG ou WEBP.';
  }
  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return 'Foto muito grande: o limite é 5 MB.';
  }
  return null;
}

async function uploadMemberPhoto(file: File, tenantId: string, memberId: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_PHOTO_TYPES[file.type] ?? 'jpg';
  const storage = new VercelBlobStorageAdapter();
  const upload = await storage.upload({
    path: `tenants/${tenantId}/members/${memberId}/foto-${randomUUID()}.${ext}`,
    buffer,
    contentType: file.type,
  });
  return upload.url;
}

async function parseMemberForm(
  formData: FormData,
  fotoUrl: string | null,
): Promise<MemberFormValues> {
  const raw = {
    nomeCompleto: formData.get('nomeCompleto'),
    nomeMaconico: formData.get('nomeMaconico') || null,
    fotoUrl,
    email: formData.get('email'),
    telefone: formData.get('telefone') || null,
    whatsapp: formData.get('whatsapp') || null,
    endereco: formData.get('cep')
      ? {
          logradouro: formData.get('logradouro') ?? '',
          numero: formData.get('enderecoNumero') ?? '',
          bairro: formData.get('bairro') ?? '',
          cidade: formData.get('cidade') ?? '',
          estado: formData.get('estado') ?? '',
          pais: formData.get('pais') || 'Brasil',
          cep: formData.get('cep'),
        }
      : null,
    dataNascimento: formData.get('dataNascimento') || null,
    dataIniciacao: formData.get('dataIniciacao') || null,
    dataElevacao: formData.get('dataElevacao') || null,
    dataExaltacao: formData.get('dataExaltacao') || null,
    cim: formData.get('cim') || null,
    matricula: formData.get('matricula'),
    grau: formData.get('grau'),
    situacao: formData.get('situacao'),
    lojaId: formData.get('lojaId'),
    potencia: formData.get('potencia'),
    profissao: resolveProfissaoFromFormData(formData),
    empresa: formData.get('empresa') || null,
    estadoCivil: formData.get('estadoCivil') || null,
    conjugeNome: formData.get('conjugeNome') || null,
    conjugeDataNascimento: formData.get('conjugeDataNascimento') || null,
    biografia: formData.get('biografia') || null,
    redesSociais: {
      instagram: formData.get('instagram') || null,
      facebook: formData.get('facebook') || null,
      linkedin: formData.get('linkedin') || null,
    },
    observacoes: formData.get('observacoes') || null,
  };

  return normalizeConjugeFields(memberSchema.parse(raw));
}

type PortalAccessResult =
  { ok: true; userId: string; temporaryPassword: string } | { ok: false; error: string };

/**
 * Cria a conta de acesso ao Portal (Firebase Auth + `User` no Firestore +
 * Custom Claims) para um Member já existente — usada tanto no cadastro
 * (quando "Criar acesso ao Portal" está marcado) quanto na ativação
 * posterior de um Irmão cadastrado sem acesso (docs/architecture/06 —
 * "Acesso ao Portal"). O papel é escolhido por quem cadastra, dentro dos
 * papéis do próprio tenant (`role:tenantId === ctx.tenantId`, checado por
 * `InviteUserUseCase`) — `super_admin` nunca aparece nessa lista porque
 * vive só no tenant `platform`, então uma Loja nunca consegue conceder
 * Administrador Geral por aqui, mesmo sem checagem adicional.
 */
async function createPortalAccessForMember(
  container: ServerContainer,
  session: CurrentSession,
  member: Member,
  roleId: string,
): Promise<PortalAccessResult> {
  if (!roleId) {
    return { ok: false, error: 'Selecione o papel de acesso.' };
  }
  const role = await container.repositories.role.findById(roleId);
  if (!role || role.tenantId !== session.authContext.tenantId) {
    return { ok: false, error: 'Papel de acesso inválido.' };
  }

  const temporaryPassword = generateTemporaryPassword();
  const authUser = await getAdminAuth()
    .createUser({ email: member.email, password: temporaryPassword })
    .catch((error: unknown) =>
      error instanceof Error ? error.message : 'Falha ao criar a conta de acesso.',
    );
  if (typeof authUser === 'string') {
    return { ok: false, error: authUser };
  }

  const userResult = await container.useCases.inviteUser.execute(session.authContext, {
    uid: authUser.uid,
    email: member.email,
    roleId: role.id,
    memberId: member.id,
  });
  if (!userResult.ok) {
    return { ok: false, error: userResult.error.message };
  }

  await syncUserClaims(userResult.value, role);
  return { ok: true, userId: authUser.uid, temporaryPassword };
}

/**
 * Cadastra o Irmão e, opcionalmente na mesma operação, sua conta de acesso
 * ao Portal — "Acesso ao Portal" no formulário decide se `criarAcesso` vem
 * marcado. Sem duplicar cadastro: 1 Irmão = 1 Member, e no máximo 1 User de
 * acesso vinculado por `memberId`/`userId`. Se o Irmão nascer sem acesso,
 * ele pode ser ativado depois pela tela do Irmão (`activateMemberAccessAction`).
 */
export async function createMemberAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireSession();
  const current = await getCurrentTenant();
  if (!current) return { ...EMPTY_STATE, error: 'Tenant não encontrado.' };

  formData.set('lojaId', current.tenant.id);
  formData.set('potencia', current.tenant.potencia);
  // Todo Irmão nasce com situação "regular" — mudanças de situação depois
  // disso passam exclusivamente por updateMemberSituationAction, que
  // implementa a regra de encerrar o cargo ativo (docs/architecture/06 §6.1).
  formData.set('situacao', 'regular');

  const fotoFile = formData.get('foto');
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const photoError = validatePhotoFile(fotoFile);
    if (photoError) return { ...EMPTY_STATE, error: photoError };
  }

  let input: MemberFormValues;
  try {
    input = await parseMemberForm(formData, null);
  } catch {
    return { ...EMPTY_STATE, error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const memberResult = await container.useCases.registerMember.execute(session.authContext, input);
  if (!memberResult.ok) {
    return { ...EMPTY_STATE, error: memberResult.error.message };
  }
  const member = memberResult.value;

  const fotoUrl =
    fotoFile instanceof File && fotoFile.size > 0
      ? await uploadMemberPhoto(fotoFile, session.authContext.tenantId, member.id)
      : null;

  const wantsAccess = formData.get('criarAcesso') === 'on';
  let temporaryPassword: string | null = null;
  let accessError: string | null = null;
  let newUserId: string | null = null;

  if (wantsAccess) {
    const roleId = String(formData.get('roleId') ?? '');
    const accessResult = await createPortalAccessForMember(container, session, member, roleId);
    if (accessResult.ok) {
      temporaryPassword = accessResult.temporaryPassword;
      newUserId = accessResult.userId;
    } else {
      accessError = accessResult.error;
    }
  }

  if (fotoUrl || newUserId) {
    await container.repositories.member.update({
      ...member,
      fotoUrl: fotoUrl ?? member.fotoUrl,
      userId: newUserId ?? member.userId,
      updatedAt: new Date(),
      updatedBy: session.authContext.uid,
    });
  }

  revalidatePath('/admin/irmaos');
  revalidatePath('/admin/usuarios');

  if (accessError) {
    return {
      ...EMPTY_STATE,
      memberId: member.id,
      error: `Irmão cadastrado, mas o acesso não pôde ser criado: ${accessError}`,
    };
  }
  return { error: null, memberId: member.id, temporaryPassword };
}

export async function updateMemberAction(
  memberId: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireSession();
  const current = await getCurrentTenant();
  if (!current) return { ...EMPTY_STATE, error: 'Tenant não encontrado.' };

  const container = createServerContainer();
  const existing = await container.repositories.member.findById(memberId);
  if (!existing) return { ...EMPTY_STATE, error: 'Irmão não encontrado.' };

  formData.set('lojaId', current.tenant.id);
  formData.set('potencia', current.tenant.potencia);
  // A edição geral nunca muda a situação — isso é feito por
  // updateMemberSituationAction (ver comentário em createMemberAction).
  formData.set('situacao', existing.situacao);

  const fotoFile = formData.get('foto');
  let fotoUrl = existing.fotoUrl;
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const photoError = validatePhotoFile(fotoFile);
    if (photoError) return { ...EMPTY_STATE, error: photoError };
    fotoUrl = await uploadMemberPhoto(fotoFile, session.authContext.tenantId, memberId);
  }

  let input: MemberFormValues;
  try {
    input = await parseMemberForm(formData, fotoUrl);
  } catch {
    return { ...EMPTY_STATE, error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const result = await container.useCases.updateMember.execute(
    session.authContext,
    memberId,
    input,
  );
  if (!result.ok) {
    return { ...EMPTY_STATE, error: result.error.message };
  }

  revalidatePath('/admin/irmaos');
  revalidatePath(`/admin/irmaos/${memberId}`);
  return { ...EMPTY_STATE, memberId };
}

/**
 * Ativa o acesso ao Portal de um Irmão que foi cadastrado sem ele — mesma
 * lógica de `createMemberAction`, mas para um Member já existente
 * (docs/architecture/06: "cadastrado" ≠ "com credencial de acesso").
 */
export async function activateMemberAccessAction(
  memberId: string,
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findById(memberId);
  if (!member || member.tenantId !== session.authContext.tenantId) {
    return { ...EMPTY_STATE, error: 'Irmão não encontrado.' };
  }
  if (member.userId) {
    return { ...EMPTY_STATE, memberId, error: 'Este Irmão já possui acesso ao Portal.' };
  }

  const roleId = String(formData.get('roleId') ?? '');
  const accessResult = await createPortalAccessForMember(container, session, member, roleId);
  if (!accessResult.ok) {
    return { ...EMPTY_STATE, memberId, error: accessResult.error };
  }

  await container.repositories.member.update({
    ...member,
    userId: accessResult.userId,
    updatedAt: new Date(),
    updatedBy: session.authContext.uid,
  });

  revalidatePath('/admin/irmaos');
  revalidatePath(`/admin/irmaos/${memberId}`);
  revalidatePath('/admin/usuarios');
  return { error: null, memberId, temporaryPassword: accessResult.temporaryPassword };
}

export async function updateMemberSituationAction(
  memberId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  const novaSituacao = formData.get('situacao') as MemberSituation;

  const container = createServerContainer();
  const result = await container.useCases.updateMemberSituation.execute(
    session.authContext,
    memberId,
    novaSituacao,
  );
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/admin/irmaos');
  revalidatePath(`/admin/irmaos/${memberId}`);
}

export async function softDeleteMemberAction(memberId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteMember.execute(session.authContext, memberId);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  revalidatePath('/admin/irmaos');
  redirect('/admin/irmaos');
}
