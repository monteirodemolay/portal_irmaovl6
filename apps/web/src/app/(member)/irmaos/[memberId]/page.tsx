import Link from 'next/link';
import { hasPermission, type DirectoryMemberDTO } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { ArrowLeft, Card, CardContent, EmptyState, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';
import { SeeAlsoSection } from '@/modules/central/components/directorio/see-also-section';
import { RelationsSection } from '@/modules/archive/components/relations-section';

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

  // "Ver também" — Fase F, mesma área de atuação é o elo mais direto entre
  // dois Irmãos que ainda não se conhecem (docs/architecture).
  let seeAlsoMembers: DirectoryMemberDTO[] = [];
  const areaAtuacaoKey = profile?.profissional?.areaAtuacaoKey;
  if (areaAtuacaoKey) {
    const searchResult = await container.useCases.searchDirectory.execute(session.authContext, {
      areaAtuacao: areaAtuacaoKey,
    });
    if (searchResult.ok) {
      seeAlsoMembers = searchResult.value.items
        .filter((item) => item.memberId !== memberId)
        .slice(0, 4);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/irmaos"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar à Comunidade VL6
      </Link>

      {profile ? (
        <div className="flex max-w-2xl flex-col gap-6">
          <PublicMemberProfileView
            profile={profile}
            canViewAcervo={canViewAcervo}
            isOwnProfile={isOwnProfile}
          />
        </div>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="text-muted p-6 text-sm">
            Não encontramos este Irmão no Diretório.
          </CardContent>
        </Card>
      )}

      {profile && seeAlsoMembers.length > 0 && (
        <SeeAlsoSection
          areaLabel={profile.profissional?.areaAtuacao ?? ''}
          members={seeAlsoMembers}
        />
      )}

      {profile && (
        <RelationsSection
          nodeTipo="member"
          nodeId={memberId}
          centerLabel={profile.nomeCompleto}
          centerKindLabel="Irmão"
          authContext={session.authContext}
          container={container}
        />
      )}
    </div>
  );
}
