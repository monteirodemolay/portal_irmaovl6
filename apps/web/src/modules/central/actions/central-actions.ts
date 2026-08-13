'use server';

import { revalidatePath } from 'next/cache';
import {
  memberCentralProfileSchema,
  publicationSettingsInputSchema,
  CENTRAL_CONSENT_TERM_VERSION,
  normalizeWhatsapp,
  normalizeInstagram,
  validateFacebookUrl,
  validateLinkedInUrl,
  validateLattesUrl,
  validateWebsiteUrl,
  type MemberCentralProfileValues,
  type PublicationSettingsInputValues,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface CentralActionState {
  error: string | null;
}

function parseExternalLink(
  raw: FormDataEntryValue | null,
  normalize: (value: string) => string | null,
): { value: string | null; invalid: boolean } {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  if (!trimmed) return { value: null, invalid: false };
  const normalized = normalize(trimmed);
  return { value: normalized, invalid: normalized === null };
}

export async function updateCentralProfileAction(
  _prevState: CentralActionState,
  formData: FormData,
): Promise<CentralActionState> {
  const session = await requireSession();

  let negocios: MemberCentralProfileValues['negocios'] = [];
  const negociosRaw = formData.get('negocios');
  if (typeof negociosRaw === 'string' && negociosRaw.trim()) {
    try {
      negocios = JSON.parse(negociosRaw);
    } catch {
      return { error: 'Dados de empresas/negócios inválidos.' };
    }
  }

  const whatsapp = parseExternalLink(formData.get('linkWhatsapp'), normalizeWhatsapp);
  const instagram = parseExternalLink(formData.get('linkInstagram'), normalizeInstagram);
  const facebook = parseExternalLink(formData.get('linkFacebook'), validateFacebookUrl);
  const linkedin = parseExternalLink(formData.get('linkLinkedin'), validateLinkedInUrl);
  const lattes = parseExternalLink(formData.get('linkLattes'), validateLattesUrl);
  const site = parseExternalLink(formData.get('linkSite'), validateWebsiteUrl);

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
      apresentacao: formData.get('apresentacao') || null,
      interesses: formData.get('interesses') || null,
      cidadeExibicao: formData.get('cidadeExibicao') || null,
      areaAtuacao: formData.get('areaAtuacao') || null,
      formacao: formData.get('formacao') || null,
      resumoProfissional: formData.get('resumoProfissional') || null,
      negocios,
      lojasVisitadas: formData.get('lojasVisitadas') || null,
      interessesMaconicos: formData.get('interessesMaconicos') || null,
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

  const container = createServerContainer();
  const result = await container.useCases.updateCentralProfile.execute(session.authContext, input);
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/perfil');
  return { error: null };
}

export async function updatePublicationSettingsAction(
  _prevState: CentralActionState,
  formData: FormData,
): Promise<CentralActionState> {
  const session = await requireSession();

  const bool = (key: string) => formData.get(key) === 'on';

  let input: PublicationSettingsInputValues;
  try {
    input = publicationSettingsInputSchema.parse({
      blocks: {
        apresentacao: bool('blocks.apresentacao'),
        informacoesPessoais: bool('blocks.informacoesPessoais'),
        profissional: bool('blocks.profissional'),
        empresa: bool('blocks.empresa'),
        informacoesMaconicas: bool('blocks.informacoesMaconicas'),
      },
      contacts: {
        telefone: bool('contacts.telefone'),
        whatsapp: bool('contacts.whatsapp'),
        email: bool('contacts.email'),
      },
      externalLinks: {
        whatsapp: bool('externalLinks.whatsapp'),
        instagram: bool('externalLinks.instagram'),
        facebook: bool('externalLinks.facebook'),
        linkedin: bool('externalLinks.linkedin'),
        lattes: bool('externalLinks.lattes'),
        site: bool('externalLinks.site'),
      },
    });
  } catch {
    return { error: 'Dados de privacidade inválidos.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updatePublicationSettings.execute(
    session.authContext,
    input,
    CENTRAL_CONSENT_TERM_VERSION,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/perfil');
  revalidatePath('/central');
  return { error: null };
}

export async function withdrawFromDirectoryAction(): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.withdrawFromDirectory.execute(session.authContext);
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath('/perfil');
  revalidatePath('/central');
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
  revalidatePath('/central');
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
  revalidatePath('/central');
}
