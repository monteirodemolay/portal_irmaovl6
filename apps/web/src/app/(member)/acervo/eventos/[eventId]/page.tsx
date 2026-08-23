import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { CalendarDays, Download, EmptyState, FileArchive, MapPin } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { ArchiveEventAlbum } from '@/modules/archive/components/archive-event-album';
import { loadEventAlbum } from '@/modules/archive/lib/load-event-album';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

/**
 * Álbum público de um evento — experiência do Irmão sobre o conteúdo já
 * publicado do Acervo VL6 (Fase 4, docs/architecture/11-acervo-vl6.md).
 * Não confundir com `/eventos/[eventId]` (página operacional da Agenda,
 * confirmação de presença etc. — território distinto, nunca tocado aqui)
 * nem com `/acervo/item/[id]` (convergência legada dos 4 domínios antigos
 * do Acervo, entidades diferentes de `ArchiveItem`/`ArchiveMedia`).
 */
export default async function EventAlbumPage({ params }: { params: Promise<{ eventId: string }> }) {
  const session = await requireSession();
  const { eventId } = await params;

  const container = createServerContainer();
  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== session.authContext.tenantId || event.deletedAt) {
    notFound();
  }

  const album = await loadEventAlbum(container, session.authContext, session.role, eventId);
  const hasDownloadableMedia = Boolean(album?.media.some((item) => item.allowDownload));

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title={event.titulo} backHref="/acervo/eventos" backLabel="Eventos" />

      {album && album.media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {hasDownloadableMedia && (
            <a
              href={`/api/acervo/eventos/${event.id}/zip`}
              className="border-border hover:border-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            >
              <FileArchive size={15} />
              Baixar tudo em ZIP
            </a>
          )}
          <a
            href={`/api/acervo/eventos/${event.id}/pdf`}
            className="border-border hover:border-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            <Download size={15} />
            Exportar em PDF
          </a>
        </div>
      )}

      {album?.coverMedia && (
        <img
          src={album.coverMedia.src}
          alt={album.coverMedia.altText ?? event.titulo}
          className="border-border max-h-[50vh] w-full rounded-lg border object-cover"
        />
      )}

      <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          {formatDate(event.dataInicio)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={15} />
          {event.local}
        </span>
        {album?.boardTermNome && <span>{album.boardTermNome}</span>}
      </div>

      {event.descricao && (
        <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed">{event.descricao}</p>
      )}

      {!album || album.media.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} />}
          title="Ainda não há conteúdo publicado para este evento"
          description="Fotografias, vídeos e documentos aparecerão aqui assim que a Loja publicar o registro deste evento no Acervo."
        />
      ) : (
        <ArchiveEventAlbum media={album.media} />
      )}
    </div>
  );
}
