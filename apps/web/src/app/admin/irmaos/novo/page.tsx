import { createServerContainer } from '@vl6/infra';
import { createMemberAction } from '@/modules/membership/actions/member-actions';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { MemberForm } from '@/modules/membership/components/member-form';
import { requirePagePermission } from '@/lib/auth/require-permission';

export default async function NewMemberPage() {
  const session = await requirePagePermission('member:create');

  const container = createServerContainer();
  const [roles, customProfessions] = await Promise.all([
    container.useCases.listRoles.execute(session.authContext),
    listUsedProfessions(container, session.authContext),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Irmão</h1>
      <MemberForm action={createMemberAction} roles={roles} customProfessions={customProfessions} />
    </div>
  );
}
