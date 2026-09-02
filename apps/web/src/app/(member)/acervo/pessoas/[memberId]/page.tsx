import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { getMemberJourneyCargos, getMemberJourneyCommittees } from '@vl6/domain';
import { getBoardPositionLabel } from '@vl6/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Camera,
  EmptyState,
  LodgeTenureBadge,
  Users,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { PersonPhotoGrid } from '@/modules/archive/components/person-photo-grid';
import { RelationsSection } from '@/modules/archive/components/relations-section';
import { isAccessLevelVisible } from '@/modules/archive/lib/access-level-visibility';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import { ViewCentralProfileLink } from '@/modules/central/components/directorio/view-central-profile-link';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

function initials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
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
  // cônjuge, profissão ou observações administrativas.
  const identity = {
    nomeCompleto: member.nomeCompleto,
    fotoUrl: member.fotoUrl,
    grau: member.grau,
    dataIniciacao: member.dataIniciacao,
    dataElevacao: member.dataElevacao,
    dataExaltacao: member.dataExaltacao,
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

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Pessoas" backHref="/acervo/pessoas" backLabel="Pessoas" />

      <div className="border-border bg-surface flex flex-wrap items-center gap-4 rounded-[16px] border p-5">
        <Avatar className="h-16 w-16">
          {identity.fotoUrl && <AvatarImage src={identity.fotoUrl} alt="" />}
          <AvatarFallback className="text-lg">{initials(identity.nomeCompleto)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-2xl font-semibold">{identity.nomeCompleto}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-muted text-sm">{MEMBER_DEGREE_LABELS[identity.grau]}</p>
            <LodgeTenureBadge
              dataIniciacao={identity.dataIniciacao}
              participacoes={photos.length}
              participacoesLabel="fotografias"
            />
          </div>
        </div>
      </div>

      {(identity.dataIniciacao || identity.dataElevacao || identity.dataExaltacao) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {identity.dataIniciacao && (
            <div className="border-border rounded-lg border p-4">
              <p className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                Iniciação
              </p>
              <p className="font-display mt-1 text-sm font-semibold">
                {formatDate(identity.dataIniciacao)}
              </p>
            </div>
          )}
          {identity.dataElevacao && (
            <div className="border-border rounded-lg border p-4">
              <p className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                Elevação
              </p>
              <p className="font-display mt-1 text-sm font-semibold">
                {formatDate(identity.dataElevacao)}
              </p>
            </div>
          )}
          {identity.dataExaltacao && (
            <div className="border-border rounded-lg border p-4">
              <p className="text-accent text-[10px] font-semibold uppercase tracking-wider">
                Exaltação
              </p>
              <p className="font-display mt-1 text-sm font-semibold">
                {formatDate(identity.dataExaltacao)}
              </p>
            </div>
          )}
        </div>
      )}

      {hasPublishedCentralProfile && <ViewCentralProfileLink memberId={member.id} />}

      <section aria-labelledby="trajetoria-title">
        <h2 id="trajetoria-title" className="font-display text-lg font-semibold">
          Trajetória institucional
        </h2>

        {cargos.length === 0 && comissoes.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Users size={22} />}
              title="Nenhum cargo institucional registrado"
              description="Este Irmão ainda não tem cargos de Diretoria ou comissões registrados no histórico."
            />
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-5">
            {cargos.length > 0 && (
              <div>
                <p className="text-muted text-xs font-semibold uppercase tracking-wider">Cargos</p>
                <ol className="border-border mt-3 flex flex-col gap-3 border-l pl-5">
                  {cargos.map((entry, index) => (
                    <li key={index} className="relative">
                      <span className="bg-accent absolute -left-[23px] top-1.5 h-2 w-2 rounded-full" />
                      <p className="font-display font-semibold">
                        {getBoardPositionLabel(entry.cargo)}
                      </p>
                      <p className="text-muted text-xs">
                        {entry.gestaoNome} · {formatDate(entry.dataInicio)}
                        {entry.dataFim ? ` a ${formatDate(entry.dataFim)}` : ' — atual'}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {comissoes.length > 0 && (
              <div>
                <p className="text-muted text-xs font-semibold uppercase tracking-wider">
                  Comissões
                </p>
                <ol className="border-border mt-3 flex flex-col gap-3 border-l pl-5">
                  {comissoes.map((entry, index) => (
                    <li key={index} className="relative">
                      <span className="bg-accent absolute -left-[23px] top-1.5 h-2 w-2 rounded-full" />
                      <p className="font-display font-semibold">{entry.nome}</p>
                      <p className="text-muted text-xs">
                        {entry.gestaoNome} · {formatDate(entry.dataInicio)}
                        {entry.dataFim ? ` a ${formatDate(entry.dataFim)}` : ' — atual'}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </section>

      {photos.length > 0 && (
        <section aria-labelledby="fotografias-title">
          <h2
            id="fotografias-title"
            className="font-display flex items-center gap-2 text-lg font-semibold"
          >
            <Camera size={18} />
            Fotografias
          </h2>
          <PersonPhotoGrid photos={photos} />
        </section>
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
