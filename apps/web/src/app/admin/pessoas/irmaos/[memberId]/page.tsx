import { MemberEditPanel } from '@/modules/membership/components/member-edit-panel';

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  return <MemberEditPanel memberId={memberId} />;
}
