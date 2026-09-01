'use server';

import { revalidatePath } from 'next/cache';
import {
  memberCentralProfileSchema,
  AREA_ATUACAO_KEYS,
  normalizeWhatsapp,
  normalizeInstagram,
  validateFacebookUrl,
  validateLinkedInUrl,
  validateLattesUrl,
  validateWebsiteUrl,
  CENTRAL_CONSENT_TERM_VERSION,
  type AreaAtuacaoKey,
  type MemberCentralProfileValues,
} from '@vl6/shared';
import { hasPermission, type CentralBlockKey, type ConsentConfirmationChannel } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

/**
 * Toda action deste arquivo é o caminho ADMINISTRATIVO do cadastro
 * assistido (Fase 2, docs/architecture) — nunca reaproveita as actions de
 * autoatendimento de `central-actions.ts` com `memberId` vindo de um campo
 * de formulário (o próprio spec deste módulo proíbe isso explicitamente: um
 * campo escondido não é proteção). `memberId` aqui é sempre parâmetro
 * explícito da function, e cada action confere `memberCentral:manage` ela
 * mesma antes de qualquer leitura/escrita — em cima da checagem que o Use
 * Case já faz (defesa em profundidade real, não decorativa; nunca confiar
 * só na UI escondendo o botão).
 */
export interface AdminCentralActionState {
  error: string | null;
}

async function requireManageSession() {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'memberCentral:manage')) {
    throw new Error('Sem permissão para gerenciar a Central em nome de outro Irmão.');
  }
  return session;
}

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
 * Preenche o conteúdo voluntário da Central em nome de um Irmão — nunca
 * publica nada (fica `draft` até consentimento + publicação explícita, ver
 * `publishMemberProfileBlocksAction`). Reaproveita o mesmo schema/normalizers
 * do autoatendimento, só a resolução do `memberId` é diferente.
 */
export async function updateMemberCentralProfileAssistedAction(
  memberId: string,
  _prevState: AdminCentralActionState,
  formData: FormData,
): Promise<AdminCentralActionState> {
  const session = await requireManageSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findById(memberId);
  if (!member || member.tenantId !== session.authContext.tenantId || member.deletedAt) {
    return { error: 'Irmão não encontrado.' };
  }

  const current = await container.repositories.memberCentralProfile.findByMemberId(
    session.authContext.tenantId,
    memberId,
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

  const result = await container.useCases.updateMemberCentralProfileAssisted.execute(
    session.authContext,
    memberId,
    input,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  revalidatePath('/irmaos', 'layout');
  return { error: null };
}

const CENTRAL_BLOCK_KEYS: CentralBlockKey[] = [
  'apresentacao',
  'informacoesPessoais',
  'profissional',
  'empresa',
  'informacoesMaconicas',
  'competencias',
  'servicos',
  'endereco',
  'memoriaFotografica',
];
const CENTRAL_CONTACT_KEYS = ['telefone', 'whatsapp', 'email'] as const;
const CENTRAL_LINK_KEYS = [
  'whatsapp',
  'instagram',
  'facebook',
  'linkedin',
  'lattes',
  'site',
] as const;
const CONFIRMATION_CHANNELS: ConsentConfirmationChannel[] = [
  'presencial',
  'whatsapp',
  'telefone',
  'email',
  'formulario_impresso',
];

function readCheckedKeys<T extends string>(
  formData: FormData,
  prefix: string,
  keys: readonly T[],
): T[] {
  return keys.filter((key) => formData.get(`${prefix}.${key}`) === 'on');
}

/**
 * Registra que a Administração confirmou, com o titular, a autorização para
 * publicar blocos/contatos/redes específicos — sempre `assisted_admin`
 * (o Use Case nem aceita `source` como input, então não há como esta action
 * "escolher" `self_service`).
 */
export async function recordMemberProfileConsentAction(
  memberId: string,
  _prevState: AdminCentralActionState,
  formData: FormData,
): Promise<AdminCentralActionState> {
  const session = await requireManageSession();
  const container = createServerContainer();

  const rawChannel = String(formData.get('confirmationChannel') ?? '');
  const confirmationChannel = (CONFIRMATION_CHANNELS as readonly string[]).includes(rawChannel)
    ? (rawChannel as ConsentConfirmationChannel)
    : null;
  if (!confirmationChannel) {
    return { error: 'Selecione como o consentimento foi confirmado.' };
  }

  const note = String(formData.get('note') ?? '').trim() || null;

  const result = await container.useCases.recordMemberProfileConsent.execute(session.authContext, {
    memberId,
    termoVersao: CENTRAL_CONSENT_TERM_VERSION,
    confirmationChannel,
    note,
    blocksAuthorized: readCheckedKeys(formData, 'blocks', CENTRAL_BLOCK_KEYS),
    contactsAuthorized: readCheckedKeys(formData, 'contacts', CENTRAL_CONTACT_KEYS),
    externalLinksAuthorized: readCheckedKeys(formData, 'externalLinks', CENTRAL_LINK_KEYS),
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  return { error: null };
}

/**
 * Publica os blocos/contatos/redes marcados — só funciona para o que já tem
 * um `PublicationConsent` de `grant` vigente (o Use Case rejeita a chamada
 * inteira se algo pedido não estiver autorizado).
 */
export async function publishMemberProfileBlocksAction(
  memberId: string,
  _prevState: AdminCentralActionState,
  formData: FormData,
): Promise<AdminCentralActionState> {
  const session = await requireManageSession();
  const container = createServerContainer();

  const result = await container.useCases.publishMemberProfileBlocks.execute(session.authContext, {
    memberId,
    blocks: readCheckedKeys(formData, 'blocks', CENTRAL_BLOCK_KEYS),
    contacts: readCheckedKeys(formData, 'contacts', CENTRAL_CONTACT_KEYS),
    externalLinks: readCheckedKeys(formData, 'externalLinks', CENTRAL_LINK_KEYS),
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  revalidatePath('/irmaos', 'layout');
  return { error: null };
}

/** Revoga e esconde imediatamente os itens marcados. */
export async function revokeMemberProfileConsentAction(
  memberId: string,
  _prevState: AdminCentralActionState,
  formData: FormData,
): Promise<AdminCentralActionState> {
  const session = await requireManageSession();
  const container = createServerContainer();

  const note = String(formData.get('note') ?? '').trim() || null;

  const result = await container.useCases.revokeMemberProfileConsent.execute(session.authContext, {
    memberId,
    termoVersao: CENTRAL_CONSENT_TERM_VERSION,
    note,
    blocksRevoked: readCheckedKeys(formData, 'blocks', CENTRAL_BLOCK_KEYS),
    contactsRevoked: readCheckedKeys(formData, 'contacts', CENTRAL_CONTACT_KEYS),
    externalLinksRevoked: readCheckedKeys(formData, 'externalLinks', CENTRAL_LINK_KEYS),
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  revalidatePath('/irmaos', 'layout');
  return { error: null };
}
