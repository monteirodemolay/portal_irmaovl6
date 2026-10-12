'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import {
  errorToLogContext,
  logger,
  memberSchema,
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
  type BackfillDataFalecimentoResult,
  type Member,
  type MemberSituationAttachment,
  type SeedMemberSituationHistoryReportRow,
} from '@vl6/domain';
import { generateTemporaryPassword } from '@/lib/auth/generate-temporary-password';
import { requireSession } from '@/lib/auth/require-session';
import type { CurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { ensureNodePdfDomPolyfills } from '@/lib/pdf/ensure-node-dom-polyfills';
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
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
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
  // vez que a data de iniciação/elevação/exaltação de um Irmão é
  // registrada, nasce uma entrada correspondente no Acervo — os 3 marcos da
  // trajetória maçônica (Aprendiz/Companheiro/Mestre), cada um vinculado a
  // um Evento na Agenda (reaproveitando um já existente na mesma data, ou
  // criando um novo automaticamente quando não há nenhum). Orquestrado aqui
  // na Server Action (não dentro de `RegisterMemberUseCase`) de propósito:
  // é um efeito colateral não crítico — se achar/criar o Evento ou o
  // ArchiveItem falhar por qualquer motivo, o cadastro do Irmão (o caminho
  // crítico) precisa continuar valendo mesmo assim, mesmo padrão defensivo
  // já usado abaixo pro upload de foto e pra criação de acesso
  // (`partialFailures`).
  const gradeArchiveErrors: string[] = [];
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
      gradeArchiveErrors.push('o registro da iniciação no Acervo VL6 não pôde ser criado');
    }
  }
  if (member.dataElevacao) {
    try {
      await container.useCases.createElevationArchiveItem.execute(session.authContext, {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        dataElevacao: member.dataElevacao,
      });
    } catch (error) {
      logger.error('Falha ao criar item de elevação no Acervo VL6', {
        route: 'createMemberAction',
        memberId: member.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'createMemberAction:acervoElevacao' } });
      gradeArchiveErrors.push('o registro da elevação no Acervo VL6 não pôde ser criado');
    }
  }
  if (member.dataExaltacao) {
    try {
      await container.useCases.createExaltationArchiveItem.execute(session.authContext, {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        dataExaltacao: member.dataExaltacao,
      });
    } catch (error) {
      logger.error('Falha ao criar item de exaltação no Acervo VL6', {
        route: 'createMemberAction',
        memberId: member.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'createMemberAction:acervoExaltacao' } });
      gradeArchiveErrors.push('o registro da exaltação no Acervo VL6 não pôde ser criado');
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
    ...gradeArchiveErrors,
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

function numberOrCurrentAdmin(
  formData: FormData,
  key: string,
  current: number | null,
): number | null {
  if (!formData.has(key)) return current;
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? Number(value) : null;
}

function jsonArrayOrCurrentAdmin<T>(formData: FormData, key: string, current: T[]): T[] {
  if (!formData.has(key)) return current;
  const raw = formData.get(key);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return current;
  }
}

/** Mesmo dia (calendário) para uma data maçônica não conta como mudança — só o dia importa, nunca a hora (essas datas nascem sempre à meia-noite). */
function masonicDateChanged(previous: Date | null, next: Date): boolean {
  if (!previous) return false;
  return (
    previous.getUTCFullYear() !== next.getUTCFullYear() ||
    previous.getUTCMonth() !== next.getUTCMonth() ||
    previous.getUTCDate() !== next.getUTCDate()
  );
}

/**
 * Tira o Irmão da sessão do dia ANTIGO quando uma data maçônica é
 * corrigida (ver `RemoveMemberFromCeremonyArchiveItemUseCase`) — mesmo
 * tratamento silencioso/defensivo dos `CreateXArchiveItemUseCase` vizinhos:
 * nunca falha a edição do Irmão por causa deste efeito colateral.
 */
async function removeFromOldCeremonySilently(
  container: ServerContainer,
  authContext: CurrentSession['authContext'],
  tipo: 'iniciacao' | 'elevacao' | 'exaltacao',
  previousDate: Date,
  memberId: string,
): Promise<void> {
  try {
    await container.useCases.removeMemberFromCeremonyArchiveItem.execute(authContext, {
      memberId,
      tipo,
      previousDate,
    });
  } catch (error) {
    logger.error('Falha ao remover Irmão da sessão antiga no Acervo VL6', {
      route: 'updateMemberIdentityAction',
      memberId,
      tipo,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, {
      tags: { route: `updateMemberIdentityAction:acervoRemover${tipo}` },
    });
  }
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
        conjugeAniversarioDia: numberOrCurrentAdmin(
          formData,
          'conjugeAniversarioDia',
          current.conjugeAniversarioDia,
        ),
        conjugeAniversarioMes: numberOrCurrentAdmin(
          formData,
          'conjugeAniversarioMes',
          current.conjugeAniversarioMes,
        ),
        dataCasamento: formData.has('dataCasamento')
          ? formData.get('dataCasamento') || null
          : (current.dataCasamento ?? null),
        filhos: jsonArrayOrCurrentAdmin(formData, 'filhos', current.filhos),
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
        aniversarioDia: numberOrCurrentAdmin(
          formData,
          'aniversarioDia',
          current.aniversarioDia ?? null,
        ),
        aniversarioMes: numberOrCurrentAdmin(
          formData,
          'aniversarioMes',
          current.aniversarioMes ?? null,
        ),
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
        conjugeAniversarioDia: current.conjugeAniversarioDia,
        conjugeAniversarioMes: current.conjugeAniversarioMes,
        filhos: current.filhos,
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

  // Mesma automação do Acervo VL6 disparada em `createMemberAction` — as
  // datas de iniciação/elevação/exaltação também podem ser preenchidas/
  // corrigidas aqui, na edição administrativa (docs/architecture/
  // 11-acervo-vl6.md §11.5). Idempotente (cada `CreateXArchiveItemUseCase`
  // checa seu próprio marcador `origemXMemberId` antes de criar), então
  // chamar de novo numa edição que não mudou a data é inofensivo. Mesmo
  // tratamento defensivo — nunca falha a edição do Irmão por causa deste
  // efeito colateral.
  //
  // Quando a data mudou de um valor antigo pra outro (correção de data
  // errada, não primeiro preenchimento), o Irmão primeiro sai da sessão do
  // dia ANTIGO (`RemoveMemberFromCeremonyArchiveItemUseCase`) — sem isso
  // ele ficava "esquecido" para sempre como colega de cerimônia de quem
  // realmente foi iniciado/elevado/exaltado naquele dia errado.
  if (result.value.dataIniciacao) {
    if (masonicDateChanged(current.dataIniciacao, result.value.dataIniciacao)) {
      await removeFromOldCeremonySilently(
        container,
        session.authContext,
        'iniciacao',
        current.dataIniciacao!,
        result.value.id,
      );
    }
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
  if (result.value.dataElevacao) {
    if (masonicDateChanged(current.dataElevacao, result.value.dataElevacao)) {
      await removeFromOldCeremonySilently(
        container,
        session.authContext,
        'elevacao',
        current.dataElevacao!,
        result.value.id,
      );
    }
    try {
      await container.useCases.createElevationArchiveItem.execute(session.authContext, {
        memberId: result.value.id,
        nomeCompleto: result.value.nomeCompleto,
        dataElevacao: result.value.dataElevacao,
      });
    } catch (error) {
      logger.error('Falha ao criar item de elevação no Acervo VL6', {
        route: 'updateMemberIdentityAction',
        memberId: result.value.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, {
        tags: { route: 'updateMemberIdentityAction:acervoElevacao' },
      });
    }
  }
  if (result.value.dataExaltacao) {
    if (masonicDateChanged(current.dataExaltacao, result.value.dataExaltacao)) {
      await removeFromOldCeremonySilently(
        container,
        session.authContext,
        'exaltacao',
        current.dataExaltacao!,
        result.value.id,
      );
    }
    try {
      await container.useCases.createExaltationArchiveItem.execute(session.authContext, {
        memberId: result.value.id,
        nomeCompleto: result.value.nomeCompleto,
        dataExaltacao: result.value.dataExaltacao,
      });
    } catch (error) {
      logger.error('Falha ao criar item de exaltação no Acervo VL6', {
        route: 'updateMemberIdentityAction',
        memberId: result.value.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, {
        tags: { route: 'updateMemberIdentityAction:acervoExaltacao' },
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
  // Reforço de servidor — a tela já esconde o formulário nesse caso, mas
  // nunca confia só na UI: um Irmão em In Memoriam nunca mais acessa o
  // Portal, então nunca ganha acesso novo por aqui.
  if (member.situacao === 'falecido') {
    return {
      ...EMPTY_STATE,
      memberId,
      error: 'Este Irmão está em In Memoriam — não é possível conceder acesso ao Portal.',
    };
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
  // Sem o gate de `glegAtivo` (diferente de `lojaOrigemId` acima): o campo
  // "Loja de destino" também aparece fora da seção GLEG, direto quando o
  // motivo é "transferência para outra Loja" — rastreabilidade de pra onde
  // o Irmão foi não depende de a transferência ter proveniência formal da
  // GLEG. O campo só existe no formulário quando é de fato relevante (ver
  // `RegisterSituationDialog`), então checar a presença dele já basta.
  const lojaDestinoId = formData.get('lojaDestinoId')
    ? String(formData.get('lojaDestinoId'))
    : null;

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

/**
 * Atalho de "Corrigir data de falecimento" — mesmo `EditMemberSituationRecordUseCase`
 * de `editMemberSituationRecordAction`, só que sem pedir Motivo/Documento/
 * Anexos/Justificativa: pede só a data certa. A migração automática da
 * Situação Maçônica (`SeedMemberSituationHistoryUseCase`) grava uma data
 * estimada (data de iniciação ou de cadastro) quando a real não constava no
 * cadastro antigo — corrigir isso pelo diálogo completo exigia entender
 * qual campo mexer entre vários que não tinham nada a ver com o problema.
 * A justificativa é sempre a mesma frase fixa (a regra de integridade §8
 * continua satisfeita — todo registro corrigido carrega uma justificativa
 * — só não precisa mais ser digitada à mão pra esse caso específico).
 */
export async function correctDeathDateAction(
  recordId: string,
  _prevState: SituationActionState,
  formData: FormData,
): Promise<SituationActionState> {
  const session = await requireSession();

  const dataFalecimento = parseSituationDate(formData, 'dataFalecimento');
  if (!dataFalecimento) {
    return { error: 'Informe a data de falecimento correta.', success: false };
  }

  const container = createServerContainer();
  const memberId = String(formData.get('memberId') ?? '');

  const result = await container.useCases.editMemberSituationRecord.execute(
    session.authContext,
    recordId,
    {
      dataInicio: dataFalecimento,
      justificativa: 'Correção da data de falecimento.',
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

export interface BackfillDataFalecimentoState {
  error: string | null;
  result: BackfillDataFalecimentoResult | null;
}

/**
 * Corrige `Member.dataFalecimento` de quem está In Memoriam mas ficou com
 * o campo em branco — o "Selo de Trajetória" (`LodgeTenureBadge`) só para
 * de contar tempo de Loja quando essa data existe. Seguro rodar de novo:
 * só mexe em quem ainda está com `dataFalecimento: null`.
 */
export async function backfillDataFalecimentoAction(): Promise<BackfillDataFalecimentoState> {
  const session = await requireSession();
  const container = createServerContainer();

  try {
    const result = await container.useCases.backfillDataFalecimento.execute(session.authContext);
    if (!result.ok) {
      return { error: result.error.message, result: null };
    }
    revalidatePath('/admin/pessoas/irmaos');
    revalidatePath('/admin/pessoas/situacao-migracao');
    return { error: null, result: result.value };
  } catch (error) {
    logger.error('Falha ao corrigir dataFalecimento', {
      route: 'backfillDataFalecimentoAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'backfillDataFalecimentoAction' } });
    return { error: 'Não foi possível concluir a correção. Tente novamente.', result: null };
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
