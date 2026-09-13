/**
 * "Links Úteis" — central de acessos e referências da Área do Irmão.
 * Taxonomia fechada de propósito, mesmo padrão de `ESPECIALIZACAO_BY_AREA`:
 * um vocabulário pequeno e estável rende filtros previsíveis em vez de um
 * campo livre que cada Administrador preencheria de um jeito diferente.
 */
export const LINK_CATEGORY_KEYS = ['loja', 'institucional', 'estudos', 'familia', 'outro'] as const;
export type LinkCategoryKey = (typeof LINK_CATEGORY_KEYS)[number];

export const LINK_CATEGORY_LABELS: Record<LinkCategoryKey, string> = {
  loja: 'Loja e gestão',
  institucional: 'Institucional',
  estudos: 'Estudos',
  familia: 'Família maçônica',
  outro: 'Outros',
};

/**
 * Tipo de acesso exibido em cada cartão — separa o que fica dentro do
 * próprio Portal VL6 ("interno") do que leva a um site de terceiros
 * ("externo"), além de canais de contato direto (WhatsApp, e-mail).
 */
export const LINK_ACCESS_TYPE_KEYS = ['interno', 'externo', 'contato'] as const;
export type LinkAccessTypeKey = (typeof LINK_ACCESS_TYPE_KEYS)[number];

export const LINK_ACCESS_TYPE_LABELS: Record<LinkAccessTypeKey, string> = {
  interno: 'Interno',
  externo: 'Externo',
  contato: 'Contato',
};

/** Fluxo de moderação de uma sugestão de link enviada por um Irmão. */
export const LINK_SUGGESTION_STATUS_KEYS = ['pendente', 'aprovada', 'rejeitada'] as const;
export type LinkSuggestionStatus = (typeof LINK_SUGGESTION_STATUS_KEYS)[number];

export const LINK_SUGGESTION_STATUS_LABELS: Record<LinkSuggestionStatus, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
};
