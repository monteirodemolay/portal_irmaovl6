import { createMemberAction } from '@/modules/membership/actions/member-actions';
import { MemberForm } from '@/modules/membership/components/member-form';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function NewMemberPage() {
  await requirePagePermission('member:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Irmão</h1>
      <MemberForm action={createMemberAction} />
    </div>
  );
}
