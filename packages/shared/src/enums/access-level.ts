/**
 * Nível de acesso institucional — controla quem pode ver um Evento ou um
 * item/mídia do Acervo. Vocabulário fechado reaproveitado por
 * `Event.nivelAcesso` (packages/domain/src/modules/agenda/entities/
 * event.entity.ts) e pela Fase 1 da Fundação do Acervo VL6
 * (`ArchiveItem.nivelAcesso`, `ArchiveMedia.accessLevel` — ver
 * docs/architecture/11-acervo-vl6.md §11.5). Não existia vocabulário
 * equivalente no projeto antes desta Fase 1.
 */
export const ACCESS_LEVEL_KEYS = ['publico', 'irmaos', 'membros_loja', 'administracao'] as const;
export type AccessLevel = (typeof ACCESS_LEVEL_KEYS)[number];

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  publico: 'Público',
  irmaos: 'Irmãos',
  membros_loja: 'Membros da Loja',
  administracao: 'Administração',
};
