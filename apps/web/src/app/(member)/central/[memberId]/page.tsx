import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ArrowLeft, Card, CardContent } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';

export default async function CentralMemberProfilePage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await requirePagePermission('memberDirectory:read');
  const { memberId } = await params;

  const container = createServerContainer();
  const result = await container.useCases.getPublicMemberProfile.execute(
    session.authContext,
    memberId,
  );
  const profile = result.ok ? result.value : null;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/central"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar à Central
      </Link>

      {profile ? (
        <PublicMemberProfileView profile={profile} />
      ) : (
        <Card>
          <CardContent className="text-muted p-6 text-sm">
            Este Irmão optou por não disponibilizar um perfil na Central dos Irmãos.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
