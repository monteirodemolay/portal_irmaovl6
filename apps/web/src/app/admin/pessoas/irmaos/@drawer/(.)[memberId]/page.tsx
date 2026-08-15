import { MemberEditDrawerShell } from '@/modules/membership/components/member-edit-drawer-shell';
import { MemberEditPanel } from '@/modules/membership/components/member-edit-panel';

export default async function MemberEditDrawerPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  return (
    <MemberEditDrawerShell>
      <MemberEditPanel memberId={memberId} />
    </MemberEditDrawerShell>
  );
}
