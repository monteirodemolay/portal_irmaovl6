'use server';

import { revalidatePath } from 'next/cache';
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
  type AreaAtuacaoKey,
  type MemberCentralProfileValues,
  type PublicationSettingsInputValues,
} from '@vl6/shared';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

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

  const negocios = jsonArrayOrCurrent(formData, 'negocios', current?.negocios ?? []);
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
