'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import ExcelJS from 'exceljs';
import {
  errorToLogContext,
  formatBrazilianPersonName,
  logger,
  memberSchema,
  MEMBER_DEGREES,
  MEMBER_SITUATION_REASONS,
  MEMBER_SITUATION_STATUSES,
  MEMBER_STATUS_RECORD_KINDS,
  MEMBER_STATUS_RECORD_ORIGINS,
  normalizeConjugeFields,
  type BoardPositionKey,
  type MemberFormValues,
  type MemberSituationStatus,
  type MemberStatusRecordKind,
  type MemberStatusRecordOrigin,
} from '@vl6/shared';
import {
  createServerContainer,
  getAdminAuth,
  syncUserClaims,
  type ServerContainer,
} from '@vl6/infra';
import {
  requirePermission,
  type Member,
  type MemberSituationAttachment,
  type SeedMemberSituationHistoryReportRow,
} from '@vl6/domain';
import { generateTemporaryPassword } from '@/lib/auth/generate-temporary-password';
import { requireSession } from '@/lib/auth/require-session';
import type { CurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import {
  ensureNodePdfDomPolyfills,
  ensurePdfWorkerAvailable,
} from '@/lib/pdf/ensure-node-dom-polyfills';
import { uploadMemberPhoto, validatePhotoFile } from '@/lib/membership/member-photo-upload';
import { resolveProfissaoFromFormData } from '@/lib/membership/professions';
import type { ProfileFieldActionState } from '@/modules/membership/components/profile-fields/action-state';
import {
  MEMBER_REPORT_MAX_ROWS,
  resolveMemberReportColumns,
} from '@/modules/membership/reports/member-report-columns';
import {
  buildMemberReportExportQuery,
  describeMemberReportFilters,
  type MemberReportFilters,
} from '@/modules/membership/reports/member-report-query';

// Chamada síncrona no topo do módulo (não dentro de uma função) — garante
// que os stubs existam já na primeira vez que este arquivo é avaliado,
// sem depender da ordem entre o `register()` assíncrono de
// `instrumentation.ts` e o pré-carregamento de rota do Next
// (`unstable_preloadEntries`), que é o que dispara o `import('pdf-parse')`
// mais cedo do que qualquer chamada de função poderia interceptar. Ver
// `ensureNodePdfDomPolyfills` para o porquê.
ensureNodePdfDomPolyfills();

export interface MemberActionState {
  error: string | null;
  memberId: string | null;
  temporaryPassword: string | null;
}

const EMPTY_STATE: MemberActionState = { error: null, memberId: null, temporaryPassword: null };

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
    autorizaDivulgacaoExterna: false,
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
  // Todo Irmão nasce com situação "ativo" — mudanças de situação depois
  // disso passam exclusivamente por registerMemberSituationAction, que
  // implementa a regra de encerrar o cargo ativo quando a situação vira
  // terminal (docs/architecture/06 §6.1).
  formData.set('situacao', 'ativo');

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

  // Objetivo do Acervo VL6 (docs/architecture/11-acervo-vl6.md §11.5): toda
  // vez que a data de iniciação de um Irmão é registrada, nasce uma
  // entrada correspondente no Acervo. Orquestrado aqui na Server Action
  // (não dentro de `RegisterMemberUseCase`) de propósito: é um efeito
  // colateral não crítico — se achar/criar o Evento ou o ArchiveItem falhar
  // por qualquer motivo, o cadastro do Irmão (o caminho crítico) precisa
  // continuar valendo mesmo assim, mesmo padrão defensivo já usado abaixo
  // pro upload de foto e pra criação de acesso (`partialFailures`).
  let initiationArchiveError: string | null = null;
  if (member.dataIniciacao) {
    try {
      await container.useCases.createInitiationArchiveItem.execute(session.authContext, {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        dataIniciacao: member.dataIniciacao,
      });
    } catch (error) {
      logger.error('Falha ao criar item de iniciação no Acervo VL6', {
        route: 'createMemberAction',
        memberId: member.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'createMemberAction:acervoIniciacao' } });
      initiationArchiveError = 'o registro da iniciação no Acervo VL6 não pôde ser criado';
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
    initiationArchiveError,
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
        autorizaDivulgacaoExterna: current.autorizaDivulgacaoExterna,
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
        autorizaDivulgacaoExterna: formData.has('autorizaDivulgacaoExterna')
          ? formData.get('autorizaDivulgacaoExterna') === 'on'
          : current.autorizaDivulgacaoExterna,
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

  // Mesma automação do Acervo VL6 disparada em `createMemberAction` — a
  // data de iniciação também pode ser preenchida/corrigida aqui, na edição
  // administrativa (docs/architecture/11-acervo-vl6.md §11.5). Idempotente
  // (`CreateInitiationArchiveItemUseCase` checa `origemIniciacaoMemberId`
  // antes de criar), então chamar de novo numa edição que não mudou
  // `dataIniciacao` é inofensivo. Mesmo tratamento defensivo — nunca falha
  // a edição do Irmão por causa deste efeito colateral.
  if (result.value.dataIniciacao) {
    try {
      await container.useCases.createInitiationArchiveItem.execute(session.authContext, {
        memberId: result.value.id,
        nomeCompleto: result.value.nomeCompleto,
        dataIniciacao: result.value.dataIniciacao,
      });
    } catch (error) {
      logger.error('Falha ao criar item de iniciação no Acervo VL6', {
        route: 'updateMemberIdentityAction',
        memberId: result.value.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, {
        tags: { route: 'updateMemberIdentityAction:acervoIniciacao' },
      });
    }
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

export interface SituationActionState {
  error: string | null;
  success: boolean;
}

function parseSituationDate(formData: FormData, key: string): Date | null {
  const raw = formData.get(key);
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function uploadSituationAttachments(
  formData: FormData,
  tenantId: string,
  memberId: string,
): Promise<{ error: string } | { anexos: MemberSituationAttachment[] }> {
  const { uploadMemberSituationAttachment, validateSituationAttachmentFile } =
    await import('@/lib/membership/member-situation-attachment-upload');
  const files = formData.getAll('anexos').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { anexos: [] };

  for (const file of files) {
    const error = validateSituationAttachmentFile(file);
    if (error) return { error };
  }

  try {
    const anexos = await Promise.all(
      files.map(async (file) => ({
        nome: file.name,
        url: await uploadMemberSituationAttachment(file, tenantId, memberId),
      })),
    );
    return { anexos };
  } catch (error) {
    logger.error('Falha ao enviar anexo da Situação Maçônica', {
      route: 'uploadSituationAttachments',
      memberId,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'uploadSituationAttachments' } });
    return { error: 'Não foi possível enviar os anexos. Tente novamente em instantes.' };
  }
}

/**
 * Único ponto de escrita da Situação Maçônica no lado do servidor — cobre
 * "Alterar situação", "Registrar licença" e "Registrar retorno" da UI
 * (todas chamam esta mesma action; só o motivo sugerido no formulário
 * muda por tela). RBAC (`member:update`) é checada dentro do Use Case.
 */
export async function registerMemberSituationAction(
  memberId: string,
  _prevState: SituationActionState,
  formData: FormData,
): Promise<SituationActionState> {
  const session = await requireSession();

  const situacao = formData.get('situacao') as MemberSituationStatus;
  if (!MEMBER_SITUATION_STATUSES.includes(situacao)) {
    return { error: 'Situação inválida.', success: false };
  }
  const motivo = String(formData.get('motivo') ?? '');
  const motivosValidos: readonly string[] = MEMBER_SITUATION_REASONS[situacao];
  if (!motivosValidos.includes(motivo)) {
    return { error: 'Motivo inválido para a situação selecionada.', success: false };
  }
  const dataInicio = parseSituationDate(formData, 'dataInicio');
  if (!dataInicio) {
    return { error: 'Data de início é obrigatória.', success: false };
  }
  const motivoOutroDescricao = String(formData.get('motivoOutroDescricao') ?? '').trim();
  if (motivo === 'outro' && !motivoOutroDescricao) {
    return { error: 'Descreva o motivo quando escolher "Outro".', success: false };
  }

  const uploadResult = await uploadSituationAttachments(
    formData,
    session.authContext.tenantId,
    memberId,
  );
  if ('error' in uploadResult) {
    return { error: uploadResult.error, success: false };
  }

  // Origem GLEG — toggle opcional na UI ("Origem: Grande Loja (GLEG)"). Sem
  // marcar, tudo fica `null` (comportamento local inalterado, ver
  // `RegisterMemberSituationUseCase`).
  const glegAtivo = formData.get('glegOrigem') === 'on';
  const origemRaw = String(formData.get('origem') ?? '');
  const origem: MemberStatusRecordOrigin | null =
    glegAtivo && MEMBER_STATUS_RECORD_ORIGINS.includes(origemRaw as MemberStatusRecordOrigin)
      ? (origemRaw as MemberStatusRecordOrigin)
      : null;
  const recordKindRaw = String(formData.get('recordKind') ?? '');
  const recordKind: MemberStatusRecordKind | null =
    glegAtivo && MEMBER_STATUS_RECORD_KINDS.includes(recordKindRaw as MemberStatusRecordKind)
      ? (recordKindRaw as MemberStatusRecordKind)
      : null;
  const sourceCode =
    glegAtivo && formData.get('sourceCode') ? String(formData.get('sourceCode')) : null;
  // `sourceLabel` é sempre o texto exato digitado a partir de um documento
  // real — nunca reescrito/normalizado aqui.
  const sourceLabel =
    glegAtivo && formData.get('sourceLabel') ? String(formData.get('sourceLabel')) : null;
  const lojaOrigemId =
    glegAtivo && formData.get('lojaOrigemId') ? String(formData.get('lojaOrigemId')) : null;
  const lojaDestinoId =
    glegAtivo && formData.get('lojaDestinoId') ? String(formData.get('lojaDestinoId')) : null;

  const container = createServerContainer();
  const result = await container.useCases.registerMemberSituation.execute(
    session.authContext,
    memberId,
    {
      situacao,
      motivo,
      motivoOutroDescricao: motivo === 'outro' ? motivoOutroDescricao : null,
      dataInicio,
      lojaId: formData.get('lojaId') ? String(formData.get('lojaId')) : null,
      potencia: formData.get('potencia') ? String(formData.get('potencia')) : null,
      documentoNumero: formData.get('documentoNumero')
        ? String(formData.get('documentoNumero'))
        : null,
      documentoData: parseSituationDate(formData, 'documentoData'),
      observacoes: formData.get('observacoes') ? String(formData.get('observacoes')) : null,
      anexos: uploadResult.anexos,
      origem,
      recordKind,
      sourceCode,
      sourceLabel,
      lojaOrigemId,
      lojaDestinoId,
    },
  );
  if (!result.ok) {
    return { error: result.error.message, success: false };
  }

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  return { error: null, success: true };
}

/**
 * Correção de um registro já lançado no histórico (nunca cria/apaga
 * registro) — a única porta pra ajustar motivo/documento/anexos/data de um
 * lançamento anterior, sempre com justificativa.
 */
export async function editMemberSituationRecordAction(
  recordId: string,
  _prevState: SituationActionState,
  formData: FormData,
): Promise<SituationActionState> {
  const session = await requireSession();

  const justificativa = String(formData.get('justificativa') ?? '').trim();
  if (!justificativa) {
    return {
      error: 'Justificativa obrigatória para editar um registro do histórico.',
      success: false,
    };
  }

  const memberId = String(formData.get('memberId') ?? '');
  const uploadResult = await uploadSituationAttachments(
    formData,
    session.authContext.tenantId,
    memberId,
  );
  if ('error' in uploadResult) {
    return { error: uploadResult.error, success: false };
  }

  const motivo = formData.get('motivo') ? String(formData.get('motivo')) : undefined;
  const motivoOutroDescricao = String(formData.get('motivoOutroDescricao') ?? '').trim();
  const dataInicio = parseSituationDate(formData, 'dataInicio') ?? undefined;

  const container = createServerContainer();

  // Anexo novo soma aos já existentes — nunca substitui (o Use Case
  // sobrescreve `anexos` por completo quando o input traz o campo).
  let anexos: MemberSituationAttachment[] | undefined;
  if (uploadResult.anexos.length > 0) {
    const current = await container.repositories.memberSituationRecord.findById(recordId);
    anexos = [...(current?.anexos ?? []), ...uploadResult.anexos];
  }

  const result = await container.useCases.editMemberSituationRecord.execute(
    session.authContext,
    recordId,
    {
      motivo,
      motivoOutroDescricao: motivo === 'outro' ? motivoOutroDescricao : null,
      dataInicio,
      documentoNumero: formData.get('documentoNumero')
        ? String(formData.get('documentoNumero'))
        : null,
      documentoData: parseSituationDate(formData, 'documentoData'),
      observacoes: formData.get('observacoes') ? String(formData.get('observacoes')) : null,
      anexos,
      justificativa,
    },
  );
  if (!result.ok) {
    return { error: result.error.message, success: false };
  }

  revalidatePath('/admin/pessoas/irmaos');
  if (memberId) revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  return { error: null, success: true };
}

export interface SeedSituationHistoryState {
  error: string | null;
  report: SeedMemberSituationHistoryReportRow[] | null;
}

/**
 * Migração assistida — cria o primeiro registro de Situação Maçônica pra
 * todo Irmão que ainda não tem nenhum, a partir do `situacao` legado.
 * Idempotente: rodar de novo só cobre quem ficou de fora da vez anterior.
 */
export async function seedMemberSituationHistoryAction(): Promise<SeedSituationHistoryState> {
  const session = await requireSession();
  const container = createServerContainer();

  try {
    const report = await container.useCases.seedMemberSituationHistory.execute(session.authContext);
    revalidatePath('/admin/pessoas/irmaos');
    revalidatePath('/admin/pessoas/situacao-migracao');
    return { error: null, report };
  } catch (error) {
    logger.error('Falha na migração da Situação Maçônica', {
      route: 'seedMemberSituationHistoryAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'seedMemberSituationHistoryAction' } });
    return { error: 'Não foi possível concluir a migração. Tente novamente.', report: null };
  }
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
  situacao: (typeof MEMBER_SITUATION_STATUSES)[number];
  email: string | null;
}

/** Linha já classificada pra tela de confirmação — mesmo shape de `ImportCandidateRow`, com o veredito da análise. */
export interface ImportPreviewRow extends ImportCandidateRow {
  valido: boolean;
  motivo?: string;
}

export interface ParseMembersFileState {
  error: string | null;
  rows: ImportPreviewRow[] | null;
}

const PARSE_EMPTY_STATE: ParseMembersFileState = { error: null, rows: null };

type CurrentTenant = NonNullable<Awaited<ReturnType<typeof getCurrentTenant>>>;

/**
 * Classifica uma CIM pra pré-visualização: duplicada dentro do próprio
 * arquivo (segunda ocorrência em diante) ou já cadastrada no tenant —
 * ambos os casos o Admin vê named na tela de confirmação, antes de gravar
 * qualquer coisa. `seenCims` acumula por chamada de parse (não persiste
 * entre requisições), então cada análise de arquivo começa do zero.
 */
async function classifyCim(
  container: ServerContainer,
  tenantId: string,
  cim: string | null,
  seenCims: Set<string>,
): Promise<{ ok: true } | { ok: false; motivo: string }> {
  if (!cim) return { ok: true };
  if (seenCims.has(cim)) return { ok: false, motivo: `CIM "${cim}" duplicada neste arquivo.` };
  const exists = await container.repositories.member.existsByCim(tenantId, cim);
  if (exists) return { ok: false, motivo: `CIM "${cim}" já cadastrada.` };
  seenCims.add(cim);
  return { ok: true };
}

/** Valida uma linha candidata e chama `RegisterMemberUseCase` — usada só na confirmação final (depois da pré-visualização). */
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
        autorizaDivulgacaoExterna: false,
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

const EMAIL_LOOSE_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function buildXlsxPreviewRows(
  container: ServerContainer,
  current: CurrentTenant,
  file: File,
): Promise<{ error: string } | { rows: ImportPreviewRow[] }> {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    return { error: 'Não foi possível ler o arquivo. Confirme que é um .xlsx válido.' };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { error: 'A planilha está vazia.' };
  }

  const rows: ImportPreviewRow[] = [];
  const seenCims = new Set<string>();

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const nomeRaw = cellText(row, 1);
    if (!nomeRaw) continue;
    const nome = formatBrazilianPersonName(nomeRaw);

    const cim = cellText(row, 2) || null;
    const grauRaw = cellText(row, 3);
    const situacaoRaw = cellText(row, 4);
    const email = cellText(row, 5) || null;

    const grauMatch = grauRaw ? matchEnumCaseInsensitive(MEMBER_DEGREES, grauRaw) : 'aprendiz';
    const grau = grauMatch ?? 'aprendiz';
    if (!grauMatch) {
      rows.push({
        linha: rowNumber,
        nome,
        cim,
        grau,
        situacao: 'ativo',
        email,
        valido: false,
        motivo: `Grau "${grauRaw}" inválido.`,
      });
      continue;
    }
    const situacaoMatch = situacaoRaw
      ? matchEnumCaseInsensitive(MEMBER_SITUATION_STATUSES, situacaoRaw)
      : 'ativo';
    const situacao = situacaoMatch ?? 'ativo';
    if (!situacaoMatch) {
      rows.push({
        linha: rowNumber,
        nome,
        cim,
        grau,
        situacao,
        email,
        valido: false,
        motivo: `Situação "${situacaoRaw}" inválida.`,
      });
      continue;
    }
    if (email && !EMAIL_LOOSE_PATTERN.test(email)) {
      rows.push({
        linha: rowNumber,
        nome,
        cim,
        grau,
        situacao,
        email,
        valido: false,
        motivo: `E-mail "${email}" inválido.`,
      });
      continue;
    }

    // Sequencial de propósito (não Promise.all): `seenCims`/`existsByCim` precisam ver as linhas já classificadas.
    const cimCheck = await classifyCim(container, current.tenant.id, cim, seenCims);
    rows.push({
      linha: rowNumber,
      nome,
      cim,
      grau,
      situacao,
      email,
      valido: cimCheck.ok,
      motivo: cimCheck.ok ? undefined : cimCheck.motivo,
    });
  }

  return { rows };
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
  return {
    nome: formatBrazilianPersonName(tokens.slice(0, cimIndex).join(' ')),
    cim: tokens[cimIndex]!,
    grau,
  };
}

/**
 * Relatório em PDF nunca tem e-mail e não expõe a situação como texto —
 * é só cor de linha na fonte original (Desligado/Irregular/etc.), que
 * extração de texto de PDF não carrega. Por isso todo mundo entra como
 * "regular"; quem estava marcado no PDF original precisa ser ajustado à
 * mão depois (mesmo botão "Situação" já usado na tela do Irmão) — decisão
 * consciente, mostrada pro Admin já na tela de confirmação.
 */
async function buildPdfPreviewRows(
  container: ServerContainer,
  current: CurrentTenant,
  file: File,
): Promise<{ error: string } | { rows: ImportPreviewRow[] }> {
  let text: string;
  try {
    // Import dinâmico (não no topo do módulo): esta é uma Server Action —
    // um import estático de `pdf-parse` carregaria o pacote (e o
    // `pdfjs-dist` que ele embute) em toda renderização da página de
    // importação, mesmo sem nenhum PDF enviado ainda. Isolar o carregamento
    // aqui, dentro do try/catch, faz qualquer falha do pacote virar o erro
    // amigável abaixo em vez de derrubar a página inteira. O polyfill de
    // DOMMatrix/ImageData/Path2D já roda no startup (instrumentation.ts) —
    // chamar de novo aqui é só defesa extra, é idempotente (`??=`).
    ensureNodePdfDomPolyfills();
    // Precisa vir ANTES de criar o PDFParse — ver ensurePdfWorkerAvailable.
    await ensurePdfWorkerAvailable();
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    const parsed = await parser.getText();
    await parser.destroy();
    text = parsed.text;
  } catch (error) {
    logger.error('Falha ao ler PDF na importação de Irmãos', {
      route: 'buildPdfPreviewRows',
      tenantId: current.tenant.id,
      fileName: file.name,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'buildPdfPreviewRows' } });
    return { error: 'Não foi possível ler o arquivo. Confirme que é um .pdf válido.' };
  }

  const rows: ImportPreviewRow[] = [];
  const seenCims = new Set<string>();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const parsedLine = parsePdfRosterLine(lines[i]!);
    if (!parsedLine) continue;

    // Sequencial de propósito — mesmo motivo do caminho .xlsx.
    const cimCheck = await classifyCim(container, current.tenant.id, parsedLine.cim, seenCims);
    rows.push({
      linha: i + 1,
      nome: parsedLine.nome,
      cim: parsedLine.cim,
      grau: parsedLine.grau,
      situacao: 'ativo',
      email: null,
      valido: cimCheck.ok,
      motivo: cimCheck.ok ? undefined : cimCheck.motivo,
    });
  }

  if (rows.length === 0) {
    return { error: 'Não encontrei nenhuma linha de Irmão reconhecível nesse PDF.' };
  }
  return { rows };
}

/**
 * 1ª etapa da importação em massa — só analisa o arquivo (.xlsx no mesmo
 * formato que `/api/v1/admin/members/export` escreve, ou .pdf do
 * "Relatório do módulo Irmãos" de outro sistema) e devolve cada linha
 * classificada (pronta pra importar ou com o motivo do problema), sem
 * gravar nada no Firestore ainda. O Admin revisa/seleciona na tela e só
 * então `confirmImportMembersAction` grava de fato — nenhum Use Case é
 * chamado aqui, por isso a permissão é checada explicitamente.
 */
export async function parseMembersFileAction(
  _prevState: ParseMembersFileState,
  formData: FormData,
): Promise<ParseMembersFileState> {
  const session = await requireSession();
  try {
    requirePermission(session.authContext, 'member:create');
  } catch {
    return { ...PARSE_EMPTY_STATE, error: 'Você não tem permissão para importar Irmãos.' };
  }
  const current = await getCurrentTenant();
  if (!current) return { ...PARSE_EMPTY_STATE, error: 'Tenant não encontrado.' };

  const file = formData.get('planilha');
  if (!(file instanceof File) || file.size === 0) {
    return { ...PARSE_EMPTY_STATE, error: 'Selecione um arquivo .xlsx ou .pdf.' };
  }

  const container = createServerContainer();
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const result = isPdf
    ? await buildPdfPreviewRows(container, current, file)
    : await buildXlsxPreviewRows(container, current, file);

  if ('error' in result) {
    return { ...PARSE_EMPTY_STATE, error: result.error };
  }
  return { error: null, rows: result.rows };
}

/**
 * 2ª etapa — recebe de volta só as linhas que o Admin selecionou na tela
 * de confirmação (serializadas em JSON pelo cliente, já filtradas por lá
 * pras válidas e marcadas) e grava cada uma via `RegisterMemberUseCase`,
 * sequencial pelo mesmo motivo de sempre. Reaproveita o shape de
 * `ImportCandidateRow` — o cliente nunca precisa mandar mais do que isso.
 */
export async function confirmImportMembersAction(
  _prevState: ImportMembersActionState,
  formData: FormData,
): Promise<ImportMembersActionState> {
  const session = await requireSession();
  const current = await getCurrentTenant();
  if (!current) return { ...IMPORT_EMPTY_STATE, error: 'Tenant não encontrado.' };

  let rows: ImportCandidateRow[];
  try {
    rows = JSON.parse(String(formData.get('linhas') ?? ''));
    if (!Array.isArray(rows) || rows.length === 0) throw new Error('empty');
  } catch {
    return {
      ...IMPORT_EMPTY_STATE,
      error: 'Nenhuma linha selecionada. Volte e escolha ao menos um Irmão pra importar.',
    };
  }

  const container = createServerContainer();
  const resultados: ImportMembersRowResult[] = [];
  for (const row of rows) {
    // Sequencial de propósito — mesmo motivo dos parsers.
    resultados.push(await registerImportRow(container, session, current, row));
  }

  revalidatePath('/admin/pessoas/irmaos');
  return { error: null, resultados };
}

export interface MemberReportPreviewRow {
  id: string;
  values: string[];
}

export interface MemberReportPreview {
  tenantNome: string;
  columns: { key: string; label: string }[];
  rows: MemberReportPreviewRow[];
  totalShown: number;
  hasMore: boolean;
  filtrosResumo: string;
  geradoEm: string;
  /** Querystring pronta (filtros + colunas) — os 4 links de download da prévia só concatenam `&format=X`. */
  exportQuery: string;
}

export interface MemberReportPreviewState {
  report: MemberReportPreview | null;
  error: string | null;
}

/**
 * Monta a prévia do relatório — só lê, nunca grava nada. Mesma permissão
 * já checada por `SearchMembersUseCase` (`member:read`), mas checa
 * explicitamente aqui também (mesmo padrão de `parseMembersFileAction`)
 * pra devolver uma mensagem amigável em vez de deixar o Use Case lançar.
 */
export async function buildMemberReportPreviewAction(
  _prevState: MemberReportPreviewState,
  formData: FormData,
): Promise<MemberReportPreviewState> {
  const session = await requireSession();
  try {
    requirePermission(session.authContext, 'member:read');
  } catch {
    return { report: null, error: 'Você não tem permissão para gerar relatórios de Irmãos.' };
  }
  const current = await getCurrentTenant();
  if (!current) return { report: null, error: 'Tenant não encontrado.' };

  const filters: MemberReportFilters = {
    nome: (formData.get('nome') as string) || undefined,
    grau: (formData.get('grau') as string) || undefined,
    situacao: (formData.get('situacao') as string) || undefined,
    cidade: (formData.get('cidade') as string) || undefined,
    cim: (formData.get('cim') as string) || undefined,
    cargo: (formData.get('cargo') as string) || undefined,
  };

  const selectedKeys = formData.getAll('colunas').map(String);
  const columns = resolveMemberReportColumns(selectedKeys);

  const container = createServerContainer();
  const page = await container.useCases.searchMembers.execute(
    session.authContext,
    {
      nome: filters.nome,
      grau: filters.grau,
      situacao: filters.situacao,
      cidade: filters.cidade,
      cim: filters.cim,
      cargo: filters.cargo as BoardPositionKey | undefined,
    },
    { limit: MEMBER_REPORT_MAX_ROWS },
  );

  return {
    error: null,
    report: {
      tenantNome: current.tenant.nome,
      columns: columns.map((c) => ({ key: c.key, label: c.label })),
      rows: page.items.map((member) => ({
        id: member.id,
        values: columns.map((c) => c.getValue(member)),
      })),
      totalShown: page.items.length,
      hasMore: page.hasMore,
      filtrosResumo: describeMemberReportFilters(filters),
      geradoEm: new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(),
      ),
      exportQuery: buildMemberReportExportQuery(
        filters,
        columns.map((c) => c.key),
      ),
    },
  };
}
