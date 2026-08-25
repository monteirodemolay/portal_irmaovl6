// Central de Comunicação (docs/architecture) — produção, aprovação e
// distribuição de artes institucionais (sessão, aniversário, campanha).

export const ART_TEMPLATE_TYPES = ['session', 'birthday', 'campaign', 'institutional'] as const;
export type ArtTemplateType = (typeof ART_TEMPLATE_TYPES)[number];

export const ART_TEMPLATE_TYPE_LABELS: Record<ArtTemplateType, string> = {
  session: 'Sessão',
  birthday: 'Aniversário',
  campaign: 'Campanha',
  institutional: 'Institucional',
};

export const PUBLICATION_OUTPUT_FORMATS = ['feed', 'story', 'square', 'whatsapp'] as const;
export type PublicationOutputFormat = (typeof PUBLICATION_OUTPUT_FORMATS)[number];

export const PUBLICATION_OUTPUT_FORMAT_LABELS: Record<PublicationOutputFormat, string> = {
  feed: 'Feed 4:5',
  story: 'Story 9:16',
  square: 'Quadrado 1:1',
  whatsapp: 'WhatsApp',
};

// Dimensões de referência por formato (px) — usadas pelo editor visual de
// modelos e pelo gerador de arte pra desenhar o `<canvas>` na proporção
// correta. `feed` é o formato-mãe: os demais reaproveitam a mesma arte,
// recortada/ajustada no momento da exportação.
export const PUBLICATION_OUTPUT_FORMAT_DIMENSIONS: Record<
  PublicationOutputFormat,
  { width: number; height: number }
> = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
  square: { width: 1080, height: 1080 },
  whatsapp: { width: 1080, height: 1350 },
};

export const TEMPLATE_FIELD_TYPES = ['text', 'date', 'time', 'select'] as const;
export type TemplateFieldType = (typeof TEMPLATE_FIELD_TYPES)[number];

export const TEMPLATE_FIELD_ALIGNMENTS = ['left', 'center', 'right'] as const;
export type TemplateFieldAlignment = (typeof TEMPLATE_FIELD_ALIGNMENTS)[number];

export const PUBLICATION_SOURCE_TYPES = ['agenda_event', 'member', 'manual'] as const;
export type PublicationSourceType = (typeof PUBLICATION_SOURCE_TYPES)[number];

export const PUBLICATION_STATUSES = [
  'draft',
  'awaiting_approval',
  'ready',
  'published',
  'archived',
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PUBLICATION_STATUS_LABELS: Record<PublicationStatus, string> = {
  draft: 'Em preparação',
  awaiting_approval: 'Aguardando aprovação',
  ready: 'Pronta',
  published: 'Publicada',
  archived: 'Arquivada',
};

export const PUBLICATION_CHANNELS = ['whatsapp', 'instagram_feed', 'instagram_story'] as const;
export type PublicationChannel = (typeof PUBLICATION_CHANNELS)[number];

export const PUBLICATION_CHANNEL_LABELS: Record<PublicationChannel, string> = {
  whatsapp: 'WhatsApp',
  instagram_feed: 'Instagram — Feed',
  instagram_story: 'Instagram — Story',
};
