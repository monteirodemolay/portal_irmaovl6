'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import ExcelJS from 'exceljs';
import { PDFParse } from 'pdf-parse';
import {
  errorToLogContext,
  logger,
  memberSchema,
  MEMBER_DEGREES,
  MEMBER_SITUATIONS,
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
import type { ProfileFieldActionState } from '@/modules/membership/components/profile-fields/action-state';

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
    fotoUrl,
    email: formData.get('email') || null,
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
  if (!member.email) {
    return {
      ok: false,
      error:
        'Este Irmão ainda não tem e-mail cadastrado — peça para ele reivindicar o próprio acesso em "/reivindicar", ou informe um e-mail no cartão de Identificação primeiro.',
    };
  }
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

  let fotoUrl: string | null = null;
  let fotoError: string | null = null;
  if (fotoFile instanceof File && fotoFile.size > 0) {
    try {
      fotoUrl = await uploadMemberPhoto(fotoFile, session.authContext.tenantId, member.id);
    } catch (error) {
      logger.error('Falha ao enviar foto do Irmão para o storage', {
        route: 'createMemberAction',
        memberId: member.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'createMemberAction:foto' } });
      fotoError = 'a foto não pôde ser enviada';
    }
  }

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

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath('/admin/pessoas/usuarios');

  const partialFailures = [
    accessError && `o acesso não pôde ser criado: ${accessError}`,
    fotoError,
  ].filter((message): message is string => Boolean(message));

  if (partialFailures.length > 0) {
    return {
      ...EMPTY_STATE,
      memberId: member.id,
      error: `Irmão cadastrado, mas ${partialFailures.join('; ')}.`,
    };
  }
  return { error: null, memberId: member.id, temporaryPassword };
}

/**
 * Cada cartão da edição administrativa de um Irmão edita só o subconjunto
 * de campos que exibe — `formData.has(key)` distingue "não faz parte
 * deste cartão" (mantém o valor atual) de "presente e limpo pelo
 * administrador" (grava vazio/null), mesma técnica de
 * `self-profile-actions.ts`/`central-actions.ts`. `UpdateMemberUseCase`
 * exige o shape completo de `MemberFormValues`, então os campos fora do
 * cartão em questão são sempre preenchidos com o valor já gravado.
 */
function textOrCurrentAdmin(
  formData: FormData,
  key: string,
  current: string | null,
): string | null {
  if (!formData.has(key)) return current;
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value : null;
}

/**
 * Edição administrativa dos campos também editáveis pelo próprio Irmão —
 * mesmo subconjunto de `updateMyProfileAction`, usada pelos cartões
 * compartilhados (`profile-fields/`) quando renderizados pelo Admin
 * (`action.bind(null, memberId)`). RBAC (`member:update`) é checada dentro
 * de `UpdateMemberUseCase`.
 */
export async function updateMemberProfileAction(
  memberId: string,
  _prevState: ProfileFieldActionState,
  formData: FormData,
): Promise<ProfileFieldActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const current = await container.repositories.member.findById(memberId);
  if (!current) return { error: 'Irmão não encontrado.' };

  const profissao = formData.has('profissao')
    ? resolveProfissaoFromFormData(formData)
    : current.profissao;

  const endereco = formData.has('cep')
    ? {
        logradouro: formData.get('logradouro') ?? '',
        numero: formData.get('enderecoNumero') ?? '',
        bairro: formData.get('bairro') ?? '',
        cidade: formData.get('cidade') ?? '',
        estado: formData.get('estado') ?? '',
        pais: formData.get('pais') || 'Brasil',
        cep: formData.get('cep'),
      }
    : current.endereco;

  let input: MemberFormValues;
  try {
    input = normalizeConjugeFields(
      memberSchema.parse({
        nomeCompleto: current.nomeCompleto,
        fotoUrl: current.fotoUrl,
        email: current.email,
        telefone: textOrCurrentAdmin(formData, 'telefone', current.telefone),
        whatsapp: textOrCurrentAdmin(formData, 'whatsapp', current.whatsapp),
        endereco,
        dataNascimento: current.dataNascimento,
        dataIniciacao: current.dataIniciacao,
        dataElevacao: current.dataElevacao,
        dataExaltacao: current.dataExaltacao,
        cim: current.cim,
        grau: current.grau,
        situacao: current.situacao,
        lojaId: current.lojaId,
        potencia: current.potencia,
        profissao,
        empresa: textOrCurrentAdmin(formData, 'empresa', current.empresa),
        estadoCivil: formData.has('estadoCivil')
          ? formData.get('estadoCivil') || null
          : current.estadoCivil,
        conjugeNome: formData.has('conjugeNome')
          ? textOrCurrentAdmin(formData, 'conjugeNome', current.conjugeNome)
          : current.conjugeNome,
        conjugeDataNascimento: formData.has('conjugeDataNascimento')
          ? formData.get('conjugeDataNascimento') || null
          : current.conjugeDataNascimento,
        biografia: current.biografia,
        redesSociais: current.redesSociais,
        observacoes: current.observacoes,
      }),
    );
  } catch {
    return { error: 'Dados inválidos.' };
  }

  const result = await container.useCases.updateMember.execute(
    session.authContext,
    memberId,
    input,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  revalidatePath('/irmaos', 'layout');
  return { error: null };
}

/**
 * Edição administrativa dos campos que só o Admin edita: identificação
 * (nome/e-mail/foto), dados maçônicos (CIM/grau/datas) e notas internas
 * (biografia/observações/redes sociais). Nunca alcançável pelo
 * autoatendimento — por isso não há cartão compartilhado equivalente.
 */
export async function updateMemberIdentityAction(
  memberId: string,
  _prevState: ProfileFieldActionState,
  formData: FormData,
): Promise<ProfileFieldActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const current = await container.repositories.member.findById(memberId);
  if (!current) return { error: 'Irmão não encontrado.' };

  if (formData.has('nomeCompleto') && !String(formData.get('nomeCompleto') ?? '').trim()) {
    return { error: 'Nome completo é obrigatório.' };
  }

  let fotoUrl = current.fotoUrl;
  const fotoFile = formData.get('foto');
  if (fotoFile instanceof File && fotoFile.size > 0) {
    const photoError = validatePhotoFile(fotoFile);
    if (photoError) return { error: photoError };
    try {
      fotoUrl = await uploadMemberPhoto(fotoFile, session.authContext.tenantId, memberId);
    } catch (error) {
      logger.error('Falha ao enviar foto do Irmão para o storage', {
        route: 'updateMemberIdentityAction',
        memberId,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'updateMemberIdentityAction:foto' } });
      return { error: 'Não foi possível enviar a foto. Tente novamente em instantes.' };
    }
  }

  let input: MemberFormValues;
  try {
    input = normalizeConjugeFields(
      memberSchema.parse({
        nomeCompleto: textOrCurrentAdmin(formData, 'nomeCompleto', current.nomeCompleto),
        fotoUrl,
        email: textOrCurrentAdmin(formData, 'email', current.email),
        telefone: current.telefone,
        whatsapp: current.whatsapp,
        endereco: current.endereco,
        dataNascimento: formData.has('dataNascimento')
          ? formData.get('dataNascimento') || null
          : current.dataNascimento,
        dataIniciacao: formData.has('dataIniciacao')
          ? formData.get('dataIniciacao') || null
          : current.dataIniciacao,
        dataElevacao: formData.has('dataElevacao')
          ? formData.get('dataElevacao') || null
          : current.dataElevacao,
        dataExaltacao: formData.has('dataExaltacao')
          ? formData.get('dataExaltacao') || null
          : current.dataExaltacao,
        cim: textOrCurrentAdmin(formData, 'cim', current.cim),
        grau: formData.has('grau') ? formData.get('grau') : current.grau,
        situacao: current.situacao,
        lojaId: current.lojaId,
        potencia: current.potencia,
        profissao: current.profissao,
        empresa: current.empresa,
        estadoCivil: current.estadoCivil,
        conjugeNome: current.conjugeNome,
        conjugeDataNascimento: current.conjugeDataNascimento,
        biografia: textOrCurrentAdmin(formData, 'biografia', current.biografia),
        redesSociais: {
          instagram: textOrCurrentAdmin(formData, 'instagram', current.redesSociais.instagram),
          facebook: textOrCurrentAdmin(formData, 'facebook', current.redesSociais.facebook),
          linkedin: textOrCurrentAdmin(formData, 'linkedin', current.redesSociais.linkedin),
        },
        observacoes: textOrCurrentAdmin(formData, 'observacoes', current.observacoes),
      }),
    );
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const result = await container.useCases.updateMember.execute(
    session.authContext,
    memberId,
    input,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  return { error: null };
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

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  revalidatePath('/admin/pessoas/usuarios');
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

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
}

export async function softDeleteMemberAction(memberId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteMember.execute(session.authContext, memberId);
  if (!result.ok) {
    throw new Error(result.error.message);
  }
  revalidatePath('/admin/pessoas/irmaos');
  redirect('/admin/pessoas/irmaos');
}

export interface ImportMembersRowResult {
  linha: number;
  nome: string;
  status: 'criado' | 'erro';
  motivo?: string;
}

export interface ImportMembersActionState {
  error: string | null;
  resultados: ImportMembersRowResult[] | null;
}

const IMPORT_EMPTY_STATE: ImportMembersActionState = { error: null, resultados: null };

/** Acha o valor do enum que bate com `raw` ignorando maiúsculas/minúsculas — permite "Mestre" tanto quanto "mestre" na planilha. */
function matchEnumCaseInsensitive<T extends string>(values: readonly T[], raw: string): T | null {
  const lower = raw.toLowerCase();
  return values.find((value) => value.toLowerCase() === lower) ?? null;
}

function cellText(row: ExcelJS.Row, column: number): string {
  const value = row.getCell(column).value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && 'text' in value) return String(value.text ?? '').trim();
  return String(value).trim();
}

interface ImportCandidateRow {
  linha: number;
  nome: string;
  cim: string | null;
  grau: (typeof MEMBER_DEGREES)[number];
  situacao: (typeof MEMBER_SITUATIONS)[number];
  email: string | null;
}

type CurrentTenant = NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>;

/** Valida uma linha candidata e chama `RegisterMemberUseCase` — compartilhado entre a importação por .xlsx e por .pdf. */
async function registerImportRow(
  container: ServerContainer,
  session: CurrentSession,
  current: CurrentTenant,
  row: ImportCandidateRow,
): Promise<ImportMembersRowResult> {
  let input: MemberFormValues;
  try {
    input = normalizeConjugeFields(
      memberSchema.parse({
        nomeCompleto: row.nome,
        fotoUrl: null,
        email: row.email,
        telefone: null,
        whatsapp: null,
        endereco: null,
        dataNascimento: null,
        dataIniciacao: null,
        dataElevacao: null,
        dataExaltacao: null,
        cim: row.cim,
        grau: row.grau,
        situacao: row.situacao,
        lojaId: current.tenant.id,
        potencia: current.tenant.potencia,
        profissao: null,
        empresa: null,
        estadoCivil: null,
        conjugeNome: null,
        conjugeDataNascimento: null,
        biografia: null,
        redesSociais: { instagram: null, facebook: null, linkedin: null },
        observacoes: null,
      }),
    );
  } catch {
    return {
      linha: row.linha,
      nome: row.nome,
      status: 'erro',
      motivo: row.email ? `E-mail "${row.email}" inválido.` : 'Dados inválidos.',
    };
  }

  const result = await container.useCases.registerMember.execute(session.authContext, input);
  return result.ok
    ? { linha: row.linha, nome: row.nome, status: 'criado' }
    : { linha: row.linha, nome: row.nome, status: 'erro', motivo: result.error.message };
}

async function importFromXlsx(
  container: ServerContainer,
  session: CurrentSession,
  current: CurrentTenant,
  file: File,
): Promise<ImportMembersActionState> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return {
      ...IMPORT_EMPTY_STATE,
      error: 'Não foi possível ler o arquivo. Confirme que é um .xlsx válido.',
    };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { ...IMPORT_EMPTY_STATE, error: 'A planilha está vazia.' };
  }

  const resultados: ImportMembersRowResult[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const nome = cellText(row, 1);
    if (!nome) continue;

    const cimRaw = cellText(row, 2);
    const grauRaw = cellText(row, 3);
    const situacaoRaw = cellText(row, 4);
    const emailRaw = cellText(row, 5);

    const grau = grauRaw ? matchEnumCaseInsensitive(MEMBER_DEGREES, grauRaw) : 'aprendiz';
    if (!grau) {
      resultados.push({
        linha: rowNumber,
        nome,
        status: 'erro',
        motivo: `Grau "${grauRaw}" inválido.`,
      });
      continue;
    }
    const situacao = situacaoRaw
      ? matchEnumCaseInsensitive(MEMBER_SITUATIONS, situacaoRaw)
      : 'regular';
    if (!situacao) {
      resultados.push({
        linha: rowNumber,
        nome,
        status: 'erro',
        motivo: `Situação "${situacaoRaw}" inválida.`,
      });
      continue;
    }

    // Sequencial de propósito (não Promise.all): existsByCim precisa enxergar as linhas já gravadas.
    resultados.push(
      await registerImportRow(container, session, current, {
        linha: rowNumber,
        nome,
        cim: cimRaw || null,
        grau,
        situacao,
        email: emailRaw || null,
      }),
    );
  }

  return { error: null, resultados };
}

/**
 * Reconhece uma linha de texto extraída do "Relatório do módulo Irmãos"
 * (relatório emitido por outro sistema, formato Nome/CIM/Loja/Grau — sem
 * e-mail). Cada linha real termina com o Grau (um dos `MEMBER_DEGREES`) e
 * tem um token só de dígitos em algum ponto (a CIM); título, legenda,
 * cabeçalho de coluna e o rodapé de total nunca batem os dois critérios
 * ao mesmo tempo, então são ignorados sem precisar de um "skip-list"
 * hardcoded. A coluna Loja fica entre a CIM e o Grau e é descartada — o
 * tenant já sabe qual é a própria Loja.
 */
function parsePdfRosterLine(
  line: string,
): { nome: string; cim: string; grau: (typeof MEMBER_DEGREES)[number] } | null {
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 3) return null;
  const grau = matchEnumCaseInsensitive(MEMBER_DEGREES, tokens[tokens.length - 1]!);
  if (!grau) return null;
  const cimIndex = tokens.findIndex((token) => /^\d{3,7}$/.test(token));
  if (cimIndex < 1) return null;
  return { nome: tokens.slice(0, cimIndex).join(' '), cim: tokens[cimIndex]!, grau };
}

/**
 * Relatório em PDF nunca tem e-mail e não expõe a situação como texto —
 * é só cor de linha na fonte original (Desligado/Irregular/etc.), que
 * extração de texto de PDF não carrega. Por isso todo mundo entra como
 * "regular"; quem estava marcado no PDF original precisa ser ajustado à
 * mão depois (mesmo botão "Situação" já usado na tela do Irmão) — decisão
 * consciente, documentada pro Admin na própria tela de importação.
 */
async function importFromPdf(
  container: ServerContainer,
  session: CurrentSession,
  current: CurrentTenant,
  file: File,
): Promise<ImportMembersActionState> {
  let text: string;
  try {
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    const parsed = await parser.getText();
    await parser.destroy();
    text = parsed.text;
  } catch {
    return {
      ...IMPORT_EMPTY_STATE,
      error: 'Não foi possível ler o arquivo. Confirme que é um .pdf válido.',
    };
  }

  const resultados: ImportMembersRowResult[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const parsedLine = parsePdfRosterLine(lines[i]!);
    if (!parsedLine) continue;

    // Sequencial de propósito — mesmo motivo do caminho .xlsx.
    resultados.push(
      await registerImportRow(container, session, current, {
        linha: i + 1,
        nome: parsedLine.nome,
        cim: parsedLine.cim,
        grau: parsedLine.grau,
        situacao: 'regular',
        email: null,
      }),
    );
  }

  if (resultados.length === 0) {
    return {
      ...IMPORT_EMPTY_STATE,
      error: 'Não encontrei nenhuma linha de Irmão reconhecível nesse PDF.',
    };
  }
  return { error: null, resultados };
}

/**
 * Importa Irmãos em massa a partir de um .xlsx (mesmo formato que
 * `/api/v1/admin/members/export` escreve — Nome, CIM, Grau, Situação,
 * E-mail, Cidade, via `exceljs`) ou de um .pdf ("Relatório do módulo
 * Irmãos" de outro sistema — Nome, CIM, Loja, Grau, via `pdf-parse`).
 * Cada linha reconhecida vira uma chamada a `RegisterMemberUseCase`
 * (docs/architecture/06 §6.1: mesma checagem de CIM único do cadastro
 * manual). E-mail fica opcional: quando ausente, o Irmão nasce sem acesso
 * ao Portal e pode reivindicar o próprio cadastro depois
 * (`claimMemberAccountAction`). A coluna Cidade do .xlsx não é importada
 * — precisa do endereço completo (`addressSchema` exige todos os
 * campos), que a planilha não tem; fica pra ser preenchido depois no
 * cadastro do Irmão.
 */
export async function importMembersAction(
  _prevState: ImportMembersActionState,
  formData: FormData,
): Promise<ImportMembersActionState> {
  const session = await requireSession();
  const current = await getCurrentTenant();
  if (!current) return { ...IMPORT_EMPTY_STATE, error: 'Tenant não encontrado.' };

  const file = formData.get('planilha');
  if (!(file instanceof File) || file.size === 0) {
    return { ...IMPORT_EMPTY_STATE, error: 'Selecione um arquivo .xlsx ou .pdf.' };
  }

  const container = createServerContainer();
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const state = isPdf
    ? await importFromPdf(container, session, current, file)
    : await importFromXlsx(container, session, current, file);

  if (state.resultados) {
    revalidatePath('/admin/pessoas/irmaos');
  }
  return state;
}
