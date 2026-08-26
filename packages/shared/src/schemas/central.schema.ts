import { z } from 'zod';
import { AREA_ATUACAO_KEYS, FORMA_ATENDIMENTO_KEYS } from '../enums/central';

const tagSchema = z.string().min(1).max(60);

/**
 * Versão vigente do termo de consentimento da Central — só existe uma
 * versão na v1, então a política de "o que fazer com blocos publicados sob
 * versão antiga" (docs/architecture) não precisa ser implementada ainda; o
 * modelo append-only de `PublicationConsent` já suporta isso quando houver
 * de fato uma v2.
 */
export const CENTRAL_CONSENT_TERM_VERSION = '2026-08-central-v1';

/**
 * Formulário de edição do conteúdo da Central dos Irmãos VL6
 * (docs/architecture) — "cadastrar ≠ publicar": este schema só valida o
 * CONTEÚDO dos blocos, nunca a visibilidade (ver `publicationSettingsSchema`
 * abaixo, uma decisão separada). Todo campo é opcional — ninguém é
 * obrigado a preencher nada pra usar o resto do Portal.
 */
export const centralBusinessEntrySchema = z.object({
  id: z.string().min(1),
  nomeEmpresa: z.string().min(1).max(150),
  segmento: z.string().max(150).nullable(),
  cargo: z.string().max(150).nullable(),
  descricao: z.string().max(1000).nullable(),
  cidade: z.string().max(150).nullable(),
  telefoneComercial: z.string().max(30).nullable(),
  siteUrl: z.string().url().nullable(),
  /** Logo/identidade visual do negócio — sobe pro Blob, aceita várias extensões (ver ALLOWED_LOGO_TYPES). */
  logoUrl: z.string().url().nullable(),
  /** "O que a empresa oferece" — tags curtas, o que mais importa pra busca do Diretório. */
  produtosServicos: z.array(tagSchema).max(8),
  whatsappComercial: z.string().max(30).nullable(),
  emailComercial: z.string().email().max(200).nullable(),
  instagramComercial: z.string().max(200).nullable(),
  formasAtendimento: z.array(z.enum(FORMA_ATENDIMENTO_KEYS)).max(3),
  horarioFuncionamento: z.string().max(200).nullable(),
  ofereceDescontoIrmaos: z.boolean(),
  descontoDescricao: z.string().max(200).nullable(),
});
export type CentralBusinessEntryValues = z.infer<typeof centralBusinessEntrySchema>;

export const centralExternalLinksSchema = z.object({
  whatsapp: z.string().max(30).nullable(),
  instagram: z.string().max(200).nullable(),
  facebook: z.string().max(300).nullable(),
  linkedin: z.string().max(300).nullable(),
  lattes: z.string().max(300).nullable(),
  site: z.string().max(300).nullable(),
});

export const memberCentralProfileSchema = z
  .object({
    apresentacao: z.string().max(500).nullable(),
    interesses: z.string().max(500).nullable(),
    cidadeExibicao: z.string().max(150).nullable(),
    areaAtuacao: z.enum(AREA_ATUACAO_KEYS).nullable(),
    areaAtuacaoOutra: z.string().max(150).nullable(),
    formacao: z.string().max(200).nullable(),
    resumoProfissional: z.string().max(1000).nullable(),
    /** Limite de propósito — evita a Central virar um catálogo empresarial sem fim. */
    negocios: z.array(centralBusinessEntrySchema).max(5),
    /** Tags curtas — evita virar um currículo em forma de lista infinita. */
    competencias: z.array(tagSchema).max(10),
    servicos: z.array(tagSchema).max(10),
    lojasVisitadas: z.string().max(500).nullable(),
    interessesMaconicos: z.string().max(500).nullable(),
    externalLinks: centralExternalLinksSchema,
  })
  .refine((v) => v.areaAtuacao !== 'outra' || Boolean(v.areaAtuacaoOutra?.trim()), {
    message: 'Informe a área quando selecionar "Outra".',
    path: ['areaAtuacaoOutra'],
  });
export type MemberCentralProfileValues = z.infer<typeof memberCentralProfileSchema>;

const CENTRAL_BLOCK_KEYS = [
  'apresentacao',
  'informacoesPessoais',
  'profissional',
  'empresa',
  'informacoesMaconicas',
  'competencias',
  'servicos',
  'endereco',
] as const;

/**
 * Decisão de visibilidade — nunca inclui conteúdo, só booleans. Separado de
 * `memberCentralProfileSchema` de propósito: salvar um dado (schema acima)
 * e publicá-lo (schema abaixo) são ações distintas na UI, cada uma com sua
 * própria Server Action.
 */
export const publicationSettingsInputSchema = z.object({
  blocks: z.object(
    Object.fromEntries(CENTRAL_BLOCK_KEYS.map((key) => [key, z.boolean()])) as Record<
      (typeof CENTRAL_BLOCK_KEYS)[number],
      z.ZodBoolean
    >,
  ),
  contacts: z.object({
    telefone: z.boolean(),
    whatsapp: z.boolean(),
    email: z.boolean(),
  }),
  externalLinks: z.object({
    whatsapp: z.boolean(),
    instagram: z.boolean(),
    facebook: z.boolean(),
    linkedin: z.boolean(),
    lattes: z.boolean(),
    site: z.boolean(),
  }),
});
export type PublicationSettingsInputValues = z.infer<typeof publicationSettingsInputSchema>;
