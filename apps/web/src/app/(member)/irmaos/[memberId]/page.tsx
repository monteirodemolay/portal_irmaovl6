import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { ArrowLeft, Card, CardContent, EmptyState, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';
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

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/irmaos"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar ao Diretório
      </Link>

      {profile ? (
        <div className="flex max-w-2xl flex-col gap-6">
          <PublicMemberProfileView profile={profile} />
        </div>
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="text-muted p-6 text-sm">
            Este Irmão optou por não disponibilizar um perfil no Diretório.
          </CardContent>
        </Card>
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
