import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { getMemberJourneyCargos, getMemberJourneyCommittees } from '@vl6/domain';
import { getBoardPositionLabel } from '@vl6/shared';
import {
  Camera,
  CalendarDays,
  Card,
  CardContent,
  EmptyState,
  LodgeTenureBadge,
  Milestone,
  Users,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { Panel, TimelineEntry } from '@/components/membership/institutional-panel';
import { PersonPhotoGrid } from '@/modules/archive/components/person-photo-grid';
import { RelationsSection } from '@/modules/archive/components/relations-section';
import { isAccessLevelVisible } from '@/modules/archive/lib/access-level-visibility';
import { ViewCentralProfileLink } from '@/modules/central/components/directorio/view-central-profile-link';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

export default async function ArchivePersonPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await requirePagePermission('member:read');
  const { memberId } = await params;
  const { tenantId } = session.authContext;

  const container = createServerContainer();
  const member = await container.repositories.member.findById(memberId);
  if (!member || member.tenantId !== tenantId) notFound();

  // Recorte deliberadamente restrito a identidade e dados institucionais
  // (docs/architecture/11-acervo-vl6.md §11.6c) — nunca contato, endereço,
  // cônjuge, profissão ou observações administrativas. Mesma peça visual
  // do Perfil do Irmão (`public-member-profile-view.tsx`, `Panel`/
  // `TimelineEntry` compartilhados em `@/components/membership/
  // institutional-panel`), mas sem as seções voluntárias — essas só
  // aparecem via `ViewCentralProfileLink`, condicionado a opt-in
  // (`PublicationSettings.profilePublished`).
  const identity = {
    nomeCompleto: member.nomeCompleto,
    fotoUrl: member.fotoUrl,
    grau: member.grau,
    dataIniciacao: member.dataIniciacao,
    dataElevacao: member.dataElevacao,
    dataExaltacao: member.dataExaltacao,
    dataFalecimento: member.dataFalecimento,
  };

  const journeyDeps = {
    memberPositionHistoryRepository: container.repositories.memberPositionHistory,
    boardTermRepository: container.repositories.boardTerm,
    committeeRepository: container.repositories.committee,
  };

  const [cargos, comissoes, publicationSettings, taggedMedia] = await Promise.all([
    getMemberJourneyCargos(journeyDeps, memberId),
    getMemberJourneyCommittees(journeyDeps, tenantId, memberId),
    container.repositories.publicationSettings.findByMemberId(tenantId, memberId),
    container.repositories.archiveMedia.findByPessoaIdentificada(tenantId, memberId),
  ]);

  // Só mídia publicada e visível ao nível de acesso da sessão atual —
  // trajetória pública nunca vaza rascunho/reservado (item 1 do escopo da
  // Fase A "Pessoas & Descoberta", mesma regra de `loadEventAlbum`).
  const visibility = { authenticated: true, role: session.role };
  const publishedTaggedMedia = taggedMedia.filter(
    (media) =>
      media.mediaType === 'foto' &&
      media.publicacaoStatus === 'publicado' &&
      isAccessLevelVisible(media.accessLevel, visibility),
  );
  const taggedAssets = await Promise.all(
    publishedTaggedMedia.map((media) =>
      container.repositories.mediaAsset.findById(media.mediaAssetId),
    ),
  );
  const photos = publishedTaggedMedia
    .map((media, index) => {
      const asset = taggedAssets[index];
      if (!asset || asset.deletedAt) return null;
      return {
        id: media.id,
        eventId: media.eventId,
        src: `/api/archive-media/${media.id}`,
        caption: media.caption ?? asset.originalName,
      };
    })
    .filter(
      (entry): entry is { id: string; eventId: string; src: string; caption: string } =>
        entry !== null,
    );

  const hasPublishedCentralProfile =
    publicationSettings?.profilePublished === true && publicationSettings.suspendedAt === null;
  const hasTrajetoria = cargos.length > 0 || comissoes.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Pessoas" backHref="/acervo/pessoas" backLabel="Pessoas" />

      <Card className="overflow-hidden">
        <div className="from-primary to-primary-dark h-24 bg-gradient-to-br sm:h-28" />
        <CardContent className="flex flex-col gap-4 px-6 pb-6 pt-0 sm:px-8">
          <MemberAvatar
            fotoUrl={identity.fotoUrl}
            nome={identity.nomeCompleto}
            className="border-surface -mt-12 h-24 w-24 border-4 shadow-md sm:-mt-14 sm:h-28 sm:w-28"
          />
          <div className="flex flex-col gap-2">
            <p className="font-display text-2xl font-semibold sm:text-[28px]">
              {identity.nomeCompleto}
            </p>
            <MemberDegreeBadge grau={identity.grau} />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {identity.dataIniciacao && (
              <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                <CalendarDays size={13} strokeWidth={1.75} />
                Iniciado em {formatDate(identity.dataIniciacao)}
              </span>
            )}
            {identity.dataElevacao && (
              <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                Elevado em {formatDate(identity.dataElevacao)}
              </span>
            )}
            {identity.dataExaltacao && (
              <span className="border-border bg-background text-muted flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium">
                Exaltado em {formatDate(identity.dataExaltacao)}
              </span>
            )}
            <LodgeTenureBadge
              dataIniciacao={identity.dataIniciacao}
              dataFalecimento={identity.dataFalecimento}
              participacoes={photos.length}
              participacoesLabel="fotografias"
            />
          </div>
          {hasPublishedCentralProfile && <ViewCentralProfileLink memberId={member.id} />}
        </CardContent>
      </Card>

      <Panel kicker="TRAJETÓRIA" title="Trajetória institucional" icon={Milestone}>
        {hasTrajetoria ? (
          <div className="flex flex-col gap-4">
            {cargos.map((entry, index) => (
              <TimelineEntry
                key={`cargo-${index}`}
                label={getBoardPositionLabel(entry.cargo)}
                dateLabel={formatDate(entry.dataInicio)}
                active={!entry.dataFim}
                detail={`Cargo · ${entry.gestaoNome}${entry.dataFim ? ` até ${formatDate(entry.dataFim)}` : ' · em curso'}`}
                href={`/acervo/gestoes/${entry.gestaoId}`}
              />
            ))}
            {comissoes.map((entry, index) => (
              <TimelineEntry
                key={`comissao-${index}`}
                label={entry.nome}
                dateLabel={formatDate(entry.dataInicio)}
                active={!entry.dataFim}
                detail={`Comissão · ${entry.gestaoNome}${entry.dataFim ? ` até ${formatDate(entry.dataFim)}` : ' · em curso'}`}
                href={`/acervo/gestoes/${entry.gestaoId}`}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Users size={22} />}
            title="Nenhum cargo institucional registrado"
            description="Este Irmão ainda não tem cargos de Diretoria ou comissões registrados no histórico."
          />
        )}
      </Panel>

      {photos.length > 0 && (
        <Panel kicker="MEMÓRIA" title="Fotografias" icon={Camera}>
          <PersonPhotoGrid photos={photos} />
        </Panel>
      )}

      <RelationsSection
        nodeTipo="member"
        nodeId={member.id}
        centerLabel={identity.nomeCompleto}
        centerKindLabel="Pessoa"
        authContext={session.authContext}
        container={container}
      />
    </div>
  );
}
