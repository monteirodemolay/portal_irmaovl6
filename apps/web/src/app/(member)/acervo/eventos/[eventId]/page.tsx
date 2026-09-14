import Link from 'next/link';
import { notFound } from 'next/navigation';
import { hasPermission, type CeremonyMateKind } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { CalendarDays, Download, EmptyState, FileArchive, MapPin, Milestone } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { Panel } from '@/components/membership/institutional-panel';
import { ArchiveEventAlbum } from '@/modules/archive/components/archive-event-album';
import { CoverPositionPicker } from '@/modules/archive/components/cover-position-picker';
import { InstagramPreviewCard } from '@/modules/archive/components/publish-hub/publication-preview-cards';
import { updateArchiveMediaFocalPointAction } from '@/modules/archive/actions/publish-hub-actions';
import { loadEventAlbum } from '@/modules/archive/lib/load-event-album';

const CEREMONY_ORIGEM_FIELDS: {
  tipo: CeremonyMateKind;
  label: string;
  origemField: 'origemIniciacaoMemberIds' | 'origemElevacaoMemberIds' | 'origemExaltacaoMemberIds';
}[] = [
  { tipo: 'iniciacao', label: 'Iniciados neste dia', origemField: 'origemIniciacaoMemberIds' },
  { tipo: 'elevacao', label: 'Elevados neste dia', origemField: 'origemElevacaoMemberIds' },
  { tipo: 'exaltacao', label: 'Exaltados neste dia', origemField: 'origemExaltacaoMemberIds' },
];

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
  const canAdjustCover = hasPermission(session.authContext, 'archiveMedia:update');

  // Iniciados/Elevados/Exaltados neste dia — todo `ArchiveItem` vinculado a
  // este Evento pode carregar `origem*MemberIds` de cerimônia (ver
  // `ArchiveItem.origemIniciacaoMemberIds`/etc.), independente de já ter
  // mídia publicada ou não. Fecha o laço pedido pelo Administrador: quem
  // clica no Evento a partir do Perfil do Irmão precisa ver aqui quem mais
  // foi feito no mesmo dia.
  const archiveItems = await container.repositories.archiveItem.findByEventId(eventId);
  const ceremonyGroups = (
    await Promise.all(
      CEREMONY_ORIGEM_FIELDS.map(async ({ tipo, label, origemField }) => {
        const memberIds = [...new Set(archiveItems.flatMap((item) => item[origemField] ?? []))];
        if (memberIds.length === 0) return null;
        const members = await Promise.all(
          memberIds.map((id) => container.repositories.member.findById(id)),
        );
        const membros = members.filter(
          (m): m is NonNullable<typeof m> => m !== null && m.deletedAt === null,
        );
        if (membros.length === 0) return null;
        return { tipo, label, membros };
      }),
    )
  ).filter((group): group is NonNullable<typeof group> => group !== null);

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

      {album?.coverMedia &&
        (canAdjustCover ? (
          <div className="border-border overflow-hidden rounded-lg border">
            <CoverPositionPicker
              src={album.coverMedia.src}
              alt={album.coverMedia.altText ?? event.titulo}
              focalX={album.coverMedia.focalX}
              focalY={album.coverMedia.focalY}
              className="h-72 sm:h-96"
              onSave={updateArchiveMediaFocalPointAction.bind(
                null,
                album.coverMedia.archiveItemId,
                album.coverMedia.id,
              )}
            />
          </div>
        ) : (
          <img
            src={album.coverMedia.src}
            alt={album.coverMedia.altText ?? event.titulo}
            className="border-border max-h-[50vh] w-full rounded-lg border object-cover"
            style={
              album.coverMedia.focalX !== null && album.coverMedia.focalY !== null
                ? { objectPosition: `${album.coverMedia.focalX}% ${album.coverMedia.focalY}%` }
                : undefined
            }
          />
        ))}

      <div className="text-muted flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} />
          {formatDate(event.dataInicio)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={15} />
          {event.local}
        </span>
        {album?.boardTermId && album?.boardTermNome && (
          <Link
            href={`/acervo/gestoes/${album.boardTermId}`}
            className="hover:text-accent underline"
          >
            {album.boardTermNome}
          </Link>
        )}
      </div>

      {album?.instagramUrl && (
        <div className="max-w-xs">
          <InstagramPreviewCard href={album.instagramUrl} />
        </div>
      )}

      {event.descricao && (
        <p className="max-w-2xl whitespace-pre-line text-sm leading-relaxed">{event.descricao}</p>
      )}

      {ceremonyGroups.length > 0 && (
        <Panel kicker="TRAJETÓRIA" title="Feitos maçônicos neste dia" icon={Milestone}>
          <div className="flex flex-col gap-5">
            {ceremonyGroups.map((group) => (
              <div key={group.tipo} className="flex flex-col gap-2.5">
                <p className="text-muted text-xs">{group.label}:</p>
                <ul className="flex flex-wrap gap-2">
                  {group.membros.map((membro) => (
                    <li key={membro.id}>
                      <Link
                        href={`/acervo/pessoas/${membro.id}`}
                        className="border-border bg-background hover:border-primary hover:text-primary flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors"
                      >
                        <MemberAvatar
                          fotoUrl={membro.fotoUrl}
                          nome={membro.nomeCompleto}
                          className="h-6 w-6 shrink-0"
                          disablePreview
                        />
                        <span className="font-medium">{membro.nomeCompleto}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
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
