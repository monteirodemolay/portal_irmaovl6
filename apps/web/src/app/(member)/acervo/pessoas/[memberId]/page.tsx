import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { getBoardPositionLabel } from '@vl6/shared';
import { Avatar, AvatarFallback, AvatarImage, Camera, EmptyState, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
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

  const [history, publicationSettings, taggedMedia] = await Promise.all([
    container.repositories.memberPositionHistory.listByMemberId(memberId),
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

  const sortedHistory = [...history].sort(
    (a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime(),
  );
  const gestaoIds = [...new Set(sortedHistory.map((entry) => entry.gestaoId))];
  const terms = await Promise.all(
    gestaoIds.map((gestaoId) => container.repositories.boardTerm.findById(gestaoId)),
  );
  const termNameById = new Map(
    terms.filter((term) => term !== null).map((term) => [term.id, term.nome]),
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
        <div>
          <h1 className="font-display text-2xl font-semibold">{identity.nomeCompleto}</h1>
          <p className="text-muted text-sm">{MEMBER_DEGREE_LABELS[identity.grau]}</p>
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

        {sortedHistory.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<Users size={22} />}
              title="Nenhum cargo institucional registrado"
              description="Este Irmão ainda não tem cargos de Diretoria registrados no histórico."
            />
          </div>
        ) : (
          <ol className="border-border mt-4 flex flex-col gap-3 border-l pl-5">
            {sortedHistory.map((entry) => (
              <li key={entry.id} className="relative">
                <span className="bg-accent absolute -left-[23px] top-1.5 h-2 w-2 rounded-full" />
                <p className="font-display font-semibold">{getBoardPositionLabel(entry.cargo)}</p>
                <p className="text-muted text-xs">
                  {termNameById.get(entry.gestaoId) ?? 'Gestão'} · {formatDate(entry.dataInicio)}
                  {entry.dataFim ? ` a ${formatDate(entry.dataFim)}` : ' — atual'}
                </p>
              </li>
            ))}
          </ol>
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
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.map((photo) => (
              <Link
                key={photo.id}
                href={`/acervo/eventos/${photo.eventId}`}
                className="border-border hover:border-accent aspect-square overflow-hidden rounded-lg border transition-colors"
              >
                <img
                  src={photo.src}
                  alt={photo.caption}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </Link>
            ))}
          </div>
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
