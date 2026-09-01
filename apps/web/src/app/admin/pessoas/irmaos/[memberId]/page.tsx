import { AssistedMemberEditor } from '@/modules/central/components/assisted/assisted-member-editor';

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  return <AssistedMemberEditor memberId={memberId} />;
}
