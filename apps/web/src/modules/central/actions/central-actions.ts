'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import {
  memberCentralProfileSchema,
  publicationSettingsInputSchema,
  CENTRAL_CONSENT_TERM_VERSION,
  AREA_ATUACAO_KEYS,
  normalizeWhatsapp,
  normalizeInstagram,
  validateFacebookUrl,
  validateLinkedInUrl,
  validateLattesUrl,
  validateWebsiteUrl,
  errorToLogContext,
  logger,
  type AreaAtuacaoKey,
  type CentralBusinessEntryValues,
  type MemberCentralProfileValues,
  type PublicationSettingsInputValues,
} from '@vl6/shared';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { uploadBusinessLogo, validateLogoFile } from '@/lib/central/business-logo-upload';
import { lookupCnpj, type CnpjLookupFailureReason } from '@/lib/central/cnpj-lookup';

/**
 * Busca sob demanda pro painel lateral de perfil (`MemberProfileProvider`) —
 * usado por qualquer ponto do Portal que só tem o `memberId` em mãos (ex.:
 * link "Ver perfil completo" a partir do Acervo VL6), sem precisar
 * pré-carregar o Diretório inteiro. Mesma checagem de permissão e DTO já
 * filtrado que `/irmaos/[memberId]` usa.
 */
export async function getMemberProfileForDrawerAction(
  memberId: string,
): Promise<PublicMemberProfileDTO | null> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.getPublicMemberProfile.execute(
    session.authContext,
    memberId,
  );
  return result.ok ? result.value : null;
}

export interface CentralActionState {
  error: string | null;
}

export interface LookupBusinessCnpjResult {
  nomeEmpresa: string;
  cidade: string | null;
  error?: string;
}

/**
 * Atalho opcional do botão "Buscar CNPJ" em `EmpresaTab` — nunca obrigatório,
 * o Irmão pode sempre preencher "Nome da empresa" na mão. Chamada direto do
 * client (não é um `<form>` completo, é um clique isolado no meio do
 * preenchimento de um card de negócio ainda não salvo), por isso devolve o
 * resultado em vez de redirecionar/revalidar como as outras ações desta
 * tela.
 */
const CNPJ_LOOKUP_FAILURE_MESSAGES: Record<CnpjLookupFailureReason, string> = {
  invalid: 'CNPJ inválido — informe os 14 dígitos.',
  not_found: 'CNPJ não encontrado na Receita Federal. Confira os números ou preencha manualmente.',
  unavailable: 'Não foi possível consultar agora (serviço externo instável). Preencha manualmente.',
};

export async function lookupBusinessCnpjAction(cnpj: string): Promise<LookupBusinessCnpjResult> {
  await requireSession();

  const result = await lookupCnpj(cnpj);
  if ('reason' in result) {
    return { nomeEmpresa: '', cidade: null, error: CNPJ_LOOKUP_FAILURE_MESSAGES[result.reason] };
  }

  return result;
}

/**
 * Cada card do "Meu Espaço" é seu próprio `<form>` independente, cobrindo só
 * o subconjunto de campos que edita — nunca a Central/Privacidade inteiras.
 * `formData.has(key)` distingue "este campo não faz parte desta submissão"
 * (mantém o valor já gravado) de "campo presente e limpo pelo usuário"
 * (grava vazio/null) — assim cada card salva sozinho sem precisar espelhar
 * os demais campos em inputs escondidos. Para os grupos de toggles
 * (blocks/contacts/externalLinks), como `<input type="checkbox">`
 * desmarcado nunca aparece no FormData, cada card que edita um grupo
 * inteiro inclui um marcador `<grupo>.__present` — só assim dá pra
 * distinguir "toggle desmarcado" de "grupo nem faz parte deste card".
 */
function textOrCurrent(formData: FormData, key: string, current: string | null): string | null {
  if (!formData.has(key)) return current;
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value : null;
}

function jsonArrayOrCurrent<T>(formData: FormData, key: string, current: T[]): T[] {
  if (!formData.has(key)) return current;
  const raw = formData.get(key);
  if (typeof raw !== 'string' || !raw.trim()) return [];
  try {
    return JSON.parse(raw) as T[];
  } catch {
    return current;
  }
}

function parseExternalLink(
  formData: FormData,
  key: string,
  normalize: (value: string) => string | null,
  current: string | null,
): { value: string | null; invalid: boolean } {
  if (!formData.has(key)) return { value: current, invalid: false };
  const trimmed = String(formData.get(key) ?? '').trim();
  if (!trimmed) return { value: null, invalid: false };
  const normalized = normalize(trimmed);
  return { value: normalized, invalid: normalized === null };
}

/**
 * A logo é o único campo de negócio que não cabe no JSON de `negocios`
 * (é um `File`, não serializável) — por isso cada card do formulário manda
 * um `<input type="file">` à parte, nomeado `logo-<id>` (id estável do
 * negócio, o mesmo usado por `reconcileNegociosStatus`). Sem arquivo novo
 * selecionado, mantém o `logoUrl` que já veio no JSON (a empresa já tinha
 * logo, ou continua sem).
 */
async function withUploadedLogos(
  formData: FormData,
  negocios: CentralBusinessEntryValues[],
  tenantId: string,
  memberId: string,
): Promise<{ negocios: CentralBusinessEntryValues[]; error: string | null }> {
  const resolved: CentralBusinessEntryValues[] = [];
  for (const entry of negocios) {
    const file = formData.get(`logo-${entry.id}`);
    if (!(file instanceof File) || file.size === 0) {
      resolved.push(entry);
      continue;
    }
    const validationError = validateLogoFile(file);
    if (validationError) return { negocios, error: validationError };
    try {
      const logoUrl = await uploadBusinessLogo(file, tenantId, memberId, entry.id);
      resolved.push({ ...entry, logoUrl });
    } catch (error) {
      logger.error('Falha ao enviar logo de negócio para o storage', {
        route: 'updateCentralProfileAction',
        memberId,
        businessId: entry.id,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'updateCentralProfileAction:logo' } });
      return { negocios, error: 'Não foi possível enviar a logo. Tente novamente em instantes.' };
    }
  }
  return { negocios: resolved, error: null };
}

export async function updateCentralProfileAction(
  _prevState: CentralActionState,
  formData: FormData,
): Promise<CentralActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const current = await container.repositories.memberCentralProfile.findByMemberId(
    session.authContext.tenantId,
    member.id,
  );

  const negociosSubmitted = jsonArrayOrCurrent(formData, 'negocios', current?.negocios ?? []);
  const { negocios, error: logoError } = await withUploadedLogos(
    formData,
    negociosSubmitted,
    session.authContext.tenantId,
    member.id,
  );
  if (logoError) return { error: logoError };
  const competencias = jsonArrayOrCurrent(formData, 'competencias', current?.competencias ?? []);
  const servicos = jsonArrayOrCurrent(formData, 'servicos', current?.servicos ?? []);

  let areaAtuacao: AreaAtuacaoKey | null = current?.areaAtuacao ?? null;
  if (formData.has('areaAtuacao')) {
    const raw = String(formData.get('areaAtuacao') || '');
    areaAtuacao = (AREA_ATUACAO_KEYS as readonly string[]).includes(raw)
      ? (raw as AreaAtuacaoKey)
      : null;
  }

  const whatsapp = parseExternalLink(
    formData,
    'linkWhatsapp',
    normalizeWhatsapp,
    current?.externalLinks.whatsapp ?? null,
  );
  const instagram = parseExternalLink(
    formData,
    'linkInstagram',
    normalizeInstagram,
    current?.externalLinks.instagram ?? null,
  );
  const facebook = parseExternalLink(
    formData,
    'linkFacebook',
    validateFacebookUrl,
    current?.externalLinks.facebook ?? null,
  );
  const linkedin = parseExternalLink(
    formData,
    'linkLinkedin',
    validateLinkedInUrl,
    current?.externalLinks.linkedin ?? null,
  );
  const lattes = parseExternalLink(
    formData,
    'linkLattes',
    validateLattesUrl,
    current?.externalLinks.lattes ?? null,
  );
  const site = parseExternalLink(
    formData,
    'linkSite',
    validateWebsiteUrl,
    current?.externalLinks.site ?? null,
  );

  if (whatsapp.invalid) return { error: 'WhatsApp inválido — informe um número válido.' };
  if (instagram.invalid)
    return { error: 'Instagram inválido — informe @usuario ou a URL do perfil.' };
  if (facebook.invalid) return { error: 'Link do Facebook inválido — precisa ser facebook.com.' };
  if (linkedin.invalid) return { error: 'Link do LinkedIn inválido — precisa ser linkedin.com.' };
  if (lattes.invalid) return { error: 'Link do Lattes inválido — precisa ser lattes.cnpq.br.' };
  if (site.invalid) return { error: 'Site inválido — use uma URL HTTPS completa.' };

  let input: MemberCentralProfileValues;
  try {
    input = memberCentralProfileSchema.parse({
      apresentacao: textOrCurrent(formData, 'apresentacao', current?.apresentacao ?? null),
      interesses: textOrCurrent(formData, 'interesses', current?.interesses ?? null),
      cidadeExibicao: textOrCurrent(formData, 'cidadeExibicao', current?.cidadeExibicao ?? null),
      areaAtuacao,
      areaAtuacaoOutra: textOrCurrent(
        formData,
        'areaAtuacaoOutra',
        current?.areaAtuacaoOutra ?? null,
      ),
      formacao: textOrCurrent(formData, 'formacao', current?.formacao ?? null),
      resumoProfissional: textOrCurrent(
        formData,
        'resumoProfissional',
        current?.resumoProfissional ?? null,
      ),
      negocios,
      competencias,
      servicos,
      lojasVisitadas: textOrCurrent(formData, 'lojasVisitadas', current?.lojasVisitadas ?? null),
      interessesMaconicos: textOrCurrent(
        formData,
        'interessesMaconicos',
        current?.interessesMaconicos ?? null,
      ),
      externalLinks: {
        whatsapp: whatsapp.value,
        instagram: instagram.value,
        facebook: facebook.value,
        linkedin: linkedin.value,
        lattes: lattes.value,
        site: site.value,
      },
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos preenchidos.' };
  }

  const result = await container.useCases.updateCentralProfile.execute(session.authContext, input);
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/irmaos', 'layout');
  return { error: null };
}

export async function updatePublicationSettingsAction(
  _prevState: CentralActionState,
  formData: FormData,
): Promise<CentralActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const current = await container.repositories.publicationSettings.findByMemberId(
    session.authContext.tenantId,
    member.id,
  );

  const blocksIncluded = formData.has('blocks.__present');
  const contactsIncluded = formData.has('contacts.__present');
  const linksIncluded = formData.has('externalLinks.__present');

  const bool = (key: string, included: boolean, currentValue: boolean) =>
    included ? formData.get(key) === 'on' : currentValue;

  let input: PublicationSettingsInputValues;
  try {
    input = publicationSettingsInputSchema.parse({
      blocks: {
        apresentacao: bool(
          'blocks.apresentacao',
          blocksIncluded,
          current?.blocks.apresentacao ?? false,
        ),
        informacoesPessoais: bool(
          'blocks.informacoesPessoais',
          blocksIncluded,
          current?.blocks.informacoesPessoais ?? false,
        ),
        profissional: bool(
          'blocks.profissional',
          blocksIncluded,
          current?.blocks.profissional ?? false,
        ),
        empresa: bool('blocks.empresa', blocksIncluded, current?.blocks.empresa ?? false),
        informacoesMaconicas: bool(
          'blocks.informacoesMaconicas',
          blocksIncluded,
          current?.blocks.informacoesMaconicas ?? false,
        ),
        competencias: bool(
          'blocks.competencias',
          blocksIncluded,
          current?.blocks.competencias ?? false,
        ),
        servicos: bool('blocks.servicos', blocksIncluded, current?.blocks.servicos ?? false),
        endereco: bool('blocks.endereco', blocksIncluded, current?.blocks.endereco ?? false),
      },
      contacts: {
        telefone: bool('contacts.telefone', contactsIncluded, current?.contacts.telefone ?? false),
        whatsapp: bool('contacts.whatsapp', contactsIncluded, current?.contacts.whatsapp ?? false),
        email: bool('contacts.email', contactsIncluded, current?.contacts.email ?? false),
      },
      externalLinks: {
        whatsapp: bool(
          'externalLinks.whatsapp',
          linksIncluded,
          current?.externalLinks.whatsapp ?? false,
        ),
        instagram: bool(
          'externalLinks.instagram',
          linksIncluded,
          current?.externalLinks.instagram ?? false,
        ),
        facebook: bool(
          'externalLinks.facebook',
          linksIncluded,
          current?.externalLinks.facebook ?? false,
        ),
        linkedin: bool(
          'externalLinks.linkedin',
          linksIncluded,
          current?.externalLinks.linkedin ?? false,
        ),
        lattes: bool('externalLinks.lattes', linksIncluded, current?.externalLinks.lattes ?? false),
        site: bool('externalLinks.site', linksIncluded, current?.externalLinks.site ?? false),
      },
    });
  } catch {
    return { error: 'Dados de privacidade inválidos.' };
  }

  const result = await container.useCases.updatePublicationSettings.execute(
    session.authContext,
    input,
    CENTRAL_CONSENT_TERM_VERSION,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/irmaos', 'layout');
  return { error: null };
}

export async function withdrawFromDirectoryAction(): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.withdrawFromDirectory.execute(session.authContext);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/irmaos', 'layout');
}

export async function suspendCentralProfileAction(memberId: string, motivo: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.suspendCentralProfile.execute(
    session.authContext,
    memberId,
    motivo,
  );
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/admin/pessoas/central');
  revalidatePath('/irmaos', 'layout');
}

export async function reactivateCentralProfileAction(memberId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.reactivateCentralProfile.execute(
    session.authContext,
    memberId,
  );
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/admin/pessoas/central');
  revalidatePath('/irmaos', 'layout');
}

export async function reviewBusinessSubmissionAction(
  memberId: string,
  businessId: string,
  decision: 'approve' | 'reject' | 'suspend',
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.reviewBusinessSubmission.execute(
    session.authContext,
    memberId,
    businessId,
    decision,
  );
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/admin/pessoas/negocios');
  revalidatePath('/irmaos/negocios');
  revalidatePath('/irmaos', 'layout');
}
