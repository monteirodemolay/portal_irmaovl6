import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, EmptyState, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { MemberProfileDrawerShell } from '@/modules/central/components/directorio/member-profile-drawer-shell';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';

export default async function MemberProfileDrawerPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await requireSession();
  const { memberId } = await params;

  if (!hasPermission(session.authContext, 'memberDirectory:read')) {
    return (
      <MemberProfileDrawerShell>
        <EmptyState
          icon={<Lock size={22} strokeWidth={1.75} />}
          title="Diretório indisponível"
          description="Sua função não tem acesso ao Diretório dos Irmãos."
        />
      </MemberProfileDrawerShell>
    );
  }

  const container = createServerContainer();
  const result = await container.useCases.getPublicMemberProfile.execute(
    session.authContext,
    memberId,
  );
  const profile = result.ok ? result.value : null;

  return (
    <MemberProfileDrawerShell>
      {profile ? (
        <PublicMemberProfileView profile={profile} />
      ) : (
        <Card>
          <CardContent className="text-muted p-6 text-sm">
            Este Irmão optou por não disponibilizar um perfil no Diretório.
          </CardContent>
        </Card>
      )}
    </MemberProfileDrawerShell>
  );
}
