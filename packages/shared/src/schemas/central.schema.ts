import { z } from 'zod';
import {
  AFFILIATION_ABRANGENCIA_KEYS,
  AREA_ATUACAO_KEYS,
  FORMA_ATENDIMENTO_KEYS,
} from '../enums/central';
import { ESPECIALIZACAO_BY_AREA } from '../enums/especializacao';

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
  /** Só dígitos (14), normalizado no servidor — atalho opcional pra preencher nomeEmpresa/cidade via BrasilAPI, nunca obrigatório. */
  cnpj: z
    .string()
    .regex(/^\d{14}$/)
    .nullable(),
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
  /**
   * Marca esta empresa/negócio como o "Principal" entre os cadastrados —
   * pura preferência de exibição do próprio Irmão (qual aparece em
   * destaque no cabeçalho do perfil), nunca participa da revisão da
   * Administração (`reconcileNegociosStatus` ignora este campo de
   * propósito, pra marcar/desmarcar Principal nunca voltar uma empresa já
   * publicada pra fila de revisão). No máximo uma entrada é Principal por
   * vez — reforçado na tela (marcar uma desmarca as outras). Opcional —
   * ausente/`undefined` equivale a `false`, mesmo padrão de campos
   * aditivos já usados no restante do Acervo/Central (nunca exige
   * migração de cadastros já existentes).
   */
  principal: z.boolean().optional(),
  /**
   * Controla se esta entrada participa do Diretório de Negócios & Serviços
   * e da moderação da Administração. Ausente/`false` (default): entrada
   * "só contato" — existe pra registro pessoal e pareamento por CNPJ
   * (`FindColleaguesByCnpjUseCase`), nunca entra em
   * `reconcileNegociosStatus`, fica sempre `status: 'nao_divulgado'`.
   * `true`: fluxo de moderação de sempre (`pending_review` → `published`).
   */
  divulgar: z.boolean().optional(),
});
export type CentralBusinessEntryValues = z.infer<typeof centralBusinessEntrySchema>;

/**
 * Vínculo com Associação/Instituição/organização sem fins lucrativos — sem
 * moderação da Administração (não é canal comercial, mesmo espírito de
 * `competencias`/`servicos`/`externalLinks`: o Irmão é responsável pelo que
 * declara). Sem `status`/`updatedAt` por isso — nada a reconciliar.
 */
export const centralAffiliationEntrySchema = z.object({
  id: z.string().min(1),
  nomeInstituicao: z.string().min(1).max(150),
  papel: z.string().max(100).nullable(),
  abrangencia: z.enum(AFFILIATION_ABRANGENCIA_KEYS).nullable(),
  /** Mais relevante quando `abrangencia === 'internacional'`, mas sempre disponível. */
  pais: z.string().max(100).nullable(),
  descricao: z.string().max(500).nullable(),
  siteUrl: z.string().url().nullable(),
  instagram: z.string().max(200).nullable(),
  /** Opcional — sobe pro Blob igual `CentralBusinessEntry.logoUrl`, nunca obrigatório. */
  logoUrl: z.string().url().nullable(),
});
export type CentralAffiliationEntryValues = z.infer<typeof centralAffiliationEntrySchema>;

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
    // 4000: apresentação pessoal do Irmão — texto de alguns parágrafos, não
    // uma frase curta (limite anterior de 500 era pequeno demais, pedido
    // explícito do Administrador da Loja).
    apresentacao: z.string().max(4000).nullable(),
    interesses: z.string().max(500).nullable(),
    cidadeExibicao: z.string().max(150).nullable(),
    areaAtuacao: z.enum(AREA_ATUACAO_KEYS).nullable(),
    areaAtuacaoOutra: z.string().max(150).nullable(),
    /** Chave da taxonomia fechada `ESPECIALIZACAO_BY_AREA[areaAtuacao]` — dependente da área selecionada. */
    especializacao: z.string().max(60).nullable(),
    /** Texto livre, só usado quando `especializacao === 'outra'`. Mesmo padrão de `areaAtuacaoOutra`. */
    especializacaoOutra: z.string().max(150).nullable(),
    formacao: z.string().max(200).nullable(),
    resumoProfissional: z.string().max(1000).nullable(),
    /** Limite de propósito — evita a Central virar um catálogo empresarial sem fim. */
    negocios: z.array(centralBusinessEntrySchema).max(5),
    /** Tags curtas — evita virar um currículo em forma de lista infinita. */
    competencias: z.array(tagSchema).max(10),
    servicos: z.array(tagSchema).max(10),
    /** Vínculos institucionais externos — sem moderação, teto técnico só pra proteger o tamanho do documento. */
    afiliacoes: z.array(centralAffiliationEntrySchema).max(20),
    lojasVisitadas: z.string().max(500).nullable(),
    interessesMaconicos: z.string().max(500).nullable(),
    externalLinks: centralExternalLinksSchema,
  })
  .refine((v) => v.areaAtuacao !== 'outra' || Boolean(v.areaAtuacaoOutra?.trim()), {
    message: 'Informe a área quando selecionar "Outra".',
    path: ['areaAtuacaoOutra'],
  })
  .refine(
    (v) =>
      !v.especializacao ||
      !v.areaAtuacao ||
      (ESPECIALIZACAO_BY_AREA[v.areaAtuacao] ?? []).includes(v.especializacao),
    {
      message: 'Especialização não pertence à área de atuação selecionada.',
      path: ['especializacao'],
    },
  )
  .refine((v) => v.especializacao !== 'outra' || Boolean(v.especializacaoOutra?.trim()), {
    message: 'Informe a especialização quando selecionar "Outra".',
    path: ['especializacaoOutra'],
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
  'afiliacoes',
  'endereco',
  'memoriaFotografica',
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
