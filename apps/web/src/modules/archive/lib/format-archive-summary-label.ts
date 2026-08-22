import type { EventArchiveSummary } from './load-event-album';

const UNIT_LABELS: { key: keyof Omit<EventArchiveSummary, 'totalCount'>; singular: string; plural: string }[] = [
  { key: 'fotos', singular: 'foto', plural: 'fotos' },
  { key: 'videos', singular: 'vídeo', plural: 'vídeos' },
  { key: 'audios', singular: 'áudio', plural: 'áudios' },
  { key: 'documentos', singular: 'documento', plural: 'documentos' },
];

/**
 * Rótulo curto do contador de mídia num card de evento em `/acervo/eventos`
 * (Fase 4) — ex. "45 fotos · 2 vídeos". Só lista as categorias com pelo
 * menos um item, na mesma ordem das abas do álbum.
 */
export function formatArchiveSummaryLabel(summary: EventArchiveSummary): string {
  return UNIT_LABELS.filter((unit) => summary[unit.key] > 0)
    .map((unit) => {
      const count = summary[unit.key];
      return `${count} ${count === 1 ? unit.singular : unit.plural}`;
    })
    .join(' · ');
}
