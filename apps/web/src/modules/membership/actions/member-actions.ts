'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { memberSchema, type MemberFormValues, type MemberSituation } from '@vl6/shared';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import { generateTemporaryPassword } from '@/lib/auth/generate-temporary-password';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

export interface MemberActionState {
  error: string | null;
  memberId: string | null;
  temporaryPassword: string | null;
}

async function parseMemberForm(formData: FormData): Promise<MemberFormValues> {
  const raw = {
    nomeCompleto: formData.get('nomeCompleto'),
    nomeMaconico: formData.get('nomeMaconico') || null,
    fotoUrl: null,
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
    profissao: formData.get('profissao') || null,
    empresa: formData.get('empresa') || null,
    estadoCivil: formData.get('estadoCivil') || null,
    biografia: formData.get('biografia') || null,
    redesSociais: {
      instagram: formData.get('instagram') || null,
      facebook: formData.get('facebook') || null,
      linkedin: formData.get('linkedin') || null,
    },
    observacoes: formData.get('observacoes') || null,
  };

  return memberSchema.parse(raw);
}

const EMPTY_STATE: MemberActionState = { error: null, memberId: null, temporaryPassword: null };

/**
 * Cadastra o Irmão e, na mesma operação, a conta de acesso ao Portal —
 * usuário é o e-mail do Irmão, senha inicial aleatória (mesmo padrão de
 * `inviteUserAction`). Antes disso eram dois passos desconectados
 * (cadastrar o Irmão em `/admin/irmaos/novo`, depois convidar um acesso em
 * `/admin/usuarios` sem vínculo nenhum com o cadastro) — o Irmão nascia sem
 * login e a Loja não conseguia terminar o cadastro. Papel de acesso
 * sempre `membro` (cargo institucional não é papel de acesso — mudar isso
 * é uma ação separada, em Usuários).
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

  let input: MemberFormValues;
  try {
    input = await parseMemberForm(formData);
  } catch {
    return { ...EMPTY_STATE, error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const memberResult = await container.useCases.registerMember.execute(session.authContext, input);
  if (!memberResult.ok) {
    return { ...EMPTY_STATE, error: memberResult.error.message };
  }
  const member = memberResult.value;

  const membroRole = await container.repositories.role.findByKey(
    session.authContext.tenantId,
    'membro',
  );
  if (!membroRole) {
    revalidatePath('/admin/irmaos');
    return {
      ...EMPTY_STATE,
      memberId: member.id,
      error:
        'Irmão cadastrado, mas o papel "membro" não foi encontrado — crie o acesso manualmente em Usuários.',
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const authUser = await getAdminAuth()
    .createUser({ email: member.email, password: temporaryPassword })
    .catch((error: unknown) => {
      return error instanceof Error ? error.message : 'Falha ao criar a conta de acesso.';
    });
  if (typeof authUser === 'string') {
    revalidatePath('/admin/irmaos');
    return {
      ...EMPTY_STATE,
      memberId: member.id,
      error: `Irmão cadastrado, mas o acesso não pôde ser criado: ${authUser}`,
    };
  }

  const userResult = await container.useCases.inviteUser.execute(session.authContext, {
    uid: authUser.uid,
    email: member.email,
    roleId: membroRole.id,
    memberId: member.id,
  });
  if (!userResult.ok) {
    revalidatePath('/admin/irmaos');
    return {
      ...EMPTY_STATE,
      memberId: member.id,
      error: `Irmão cadastrado, mas o acesso não pôde ser criado: ${userResult.error.message}`,
    };
  }

  await Promise.all([
    syncUserClaims(userResult.value, membroRole),
    container.repositories.member.update({
      ...member,
      userId: authUser.uid,
      updatedAt: new Date(),
      updatedBy: session.authContext.uid,
    }),
  ]);

  revalidatePath('/admin/irmaos');
  revalidatePath('/admin/usuarios');
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

  let input: MemberFormValues;
  try {
    input = await parseMemberForm(formData);
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
