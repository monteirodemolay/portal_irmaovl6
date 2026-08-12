import { notFound } from 'next/navigation';
import { MEMBER_SITUATIONS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { Button, Card, CardContent, CardHeader, CardTitle, Select } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  updateMemberAction,
  updateMemberSituationAction,
} from '@/modules/membership/actions/member-actions';
import { MemberForm } from '@/modules/membership/components/member-form';
import { DeleteMemberButton } from '@/modules/membership/components/delete-member-button';
import { AccessCard } from '@/modules/membership/components/access-card';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

const SITUATION_LABELS: Record<(typeof MEMBER_SITUATIONS)[number], string> = {
  regular: 'Regular',
  irregular: 'Irregular',
  remido: 'Remido',
  inativo: 'Inativo',
  falecido: 'Falecido',
  transferido: 'Transferido',
};

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const session = await requirePagePermission('member:update');
  const { memberId } = await params;

  const container = createServerContainer();
  const member = await container.repositories.member.findById(memberId);
  if (!member || member.deletedAt) notFound();

  const [roles, accessUser, customProfessions] = await Promise.all([
    container.useCases.listRoles.execute(session.authContext),
    member.userId ? container.repositories.user.findById(member.userId) : Promise.resolve(null),
    listUsedProfessions(container, session.authContext),
  ]);
  const isSelf = accessUser?.id === session.authContext.uid;

  const boundUpdate = updateMemberAction.bind(null, memberId);
  const boundUpdateSituation = updateMemberSituationAction.bind(null, memberId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MemberAvatar fotoUrl={member.fotoUrl} nome={member.nomeCompleto} className="h-12 w-12" />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold">{member.nomeCompleto}</h1>
            <MemberDegreeBadge grau={member.grau} compact />
          </div>
        </div>
        <DeleteMemberButton memberId={member.id} memberName={member.nomeCompleto} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Situação</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={boundUpdateSituation} className="flex items-end gap-2">
              <Select name="situacao" defaultValue={member.situacao} className="flex-1">
                {MEMBER_SITUATIONS.map((s) => (
                  <option key={s} value={s}>
                    {SITUATION_LABELS[s]}
                  </option>
                ))}
              </Select>
              <Button type="submit" variant="outline" size="sm">
                Atualizar
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acesso ao Portal</CardTitle>
          </CardHeader>
          <CardContent>
            <AccessCard
              memberId={member.id}
              roles={roles}
              accessUser={accessUser}
              isSelf={isSelf}
            />
          </CardContent>
        </Card>
      </div>

      <MemberForm action={boundUpdate} member={member} customProfessions={customProfessions} />
    </div>
  );
}
