import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { normalizeNameForSearch, type FamilyVisibilityLevel } from '@vl6/shared';
import { ArrowLeft, Card, CardContent, EmptyState, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';
import type { ParamasonicAffiliationDisplay } from '@/modules/central/components/profile-trajectory-tab';
import { RelationsSection } from '@/modules/archive/components/relations-section';
import { isAccessLevelVisible } from '@/modules/archive/lib/access-level-visibility';
import type { PersonPhoto } from '@/modules/archive/components/person-photo-grid';

const PUBLIC_VISIBILITY_LEVELS: readonly FamilyVisibilityLevel[] = ['members', 'archive'];

export default async function IrmaoProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await requireSession();
  const { memberId } = await params;

  if (!hasPermission(session.authContext, 'memberDirectory:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Diretório indisponível"
        description="Sua função não tem acesso ao Diretório dos Irmãos."
      />
    );
  }

  const container = createServerContainer();
  const result = await container.useCases.getPublicMemberProfile.execute(
    session.authContext,
    memberId,
  );
  const profile = result.ok ? result.value : null;
  const canViewAcervo = hasPermission(session.authContext, 'member:read');

  // "Editar meu perfil" só aparece quando a sessão é dona deste cadastro —
  // uma leitura barata (documento único) pra comparar `memberId` da rota
  // com o Irmão vinculado ao usuário logado.
  const ownMember = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  const isOwnProfile = ownMember?.id === memberId;

  // Títulos e Condições Maçônicas (Fase 1 de Honrarias) — institucional,
  // sempre exibido na seção Trajetória, mesmo motivo de `trajetoria` (não
  // passa pelos blocos de `PublicationSettings`).
  const memberTitles = profile
    ? await container.useCases.listMemberTitles.execute(session.authContext, memberId)
    : [];

  // Honrarias e Condecorações + Graus Filosóficos (Fase 3 de Honrarias) —
  // mesmo motivo de `memberTitles`, institucional e sempre exibido (a seção
  // filtra os graus filosóficos pelo `visivel` de cada um, não aqui).
  const honors = profile
    ? await container.useCases.listHonors.execute(session.authContext, memberId)
    : [];
  const philosophicalJourneys = profile
    ? await container.useCases.listPhilosophicalJourneys.execute(session.authContext, memberId)
    : [];

  // Vínculos Paramaçônicos (ex.: "foi DeMolay") — pedido do Administrador:
  // mostrar no próprio Perfil do Irmão, com link pro perfil da entidade
  // (`/paramaconicas/[entityId]`), quando existir uma `ParamasonicEntity`
  // cadastrada com o mesmo nome da organização do vínculo.
  let paramasonicAffiliations: ParamasonicAffiliationDisplay[] = [];
  if (profile && hasPermission(session.authContext, 'familyLegacy:read')) {
    const [records, entities] = await Promise.all([
      container.repositories.personFraternalRecord.listByPerson(
        session.authContext.tenantId,
        'member',
        memberId,
      ),
      hasPermission(session.authContext, 'paramasonicEntity:read')
        ? container.useCases.listParamasonicEntities.execute(session.authContext)
        : Promise.resolve([]),
    ]);
    const entityIdByNormalizedName = new Map(
      entities.map((entity) => [normalizeNameForSearch(entity.name), entity.id]),
    );
    paramasonicAffiliations = records
      .filter(
        (record) =>
          record.affiliationKind !== 'mason' &&
          PUBLIC_VISIBILITY_LEVELS.includes(record.visibility),
      )
      .map((record) => {
        const entityId = record.organizacaoNome
          ? entityIdByNormalizedName.get(normalizeNameForSearch(record.organizacaoNome))
          : undefined;
        return {
          id: record.id,
          affiliationKind: record.affiliationKind,
          organizacaoNome: record.organizacaoNome,
          unidadeNome: record.unidadeNome,
          cargos: record.cargos,
          entityHref: entityId ? `/paramaconicas/${entityId}` : null,
        };
      });
  }

  // Seção "Acervo" — herda `/acervo/pessoas/[memberId]`: fotos institucionais
  // marcadas (nunca gated pelo consentimento voluntário do Irmão, só pelo
  // nível de acesso da sessão) + Constelação da Memória. Só carregada
  // quando a sessão tem `member:read` (mesmo gate de `canViewAcervo`).
  let acervoPhotos: PersonPhoto[] = [];
  if (profile && canViewAcervo) {
    const taggedMedia = await container.repositories.archiveMedia.findByPessoaIdentificada(
      session.authContext.tenantId,
      memberId,
    );
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
    acervoPhotos = publishedTaggedMedia
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
      .filter((entry): entry is PersonPhoto => entry !== null);
  }

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-8">
      <Link
        href="/irmaos"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar à Comunidade VL6
      </Link>

      {profile ? (
        <PublicMemberProfileView
          profile={profile}
          canViewAcervo={canViewAcervo}
          isOwnProfile={isOwnProfile}
          memberTitles={memberTitles}
          honors={honors}
          philosophicalJourneys={philosophicalJourneys}
          paramasonicAffiliations={paramasonicAffiliations}
          acervoPhotos={acervoPhotos}
          acervoRelationsSlot={
            canViewAcervo && (
              <RelationsSection
                nodeTipo="member"
                nodeId={memberId}
                centerLabel={profile.nomeCompleto}
                centerKindLabel="Irmão"
                authContext={session.authContext}
                container={container}
              />
            )
          }
        />
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="text-muted p-6 text-sm">
            Não encontramos este Irmão no Diretório.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
