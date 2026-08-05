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
  await requirePagePermission('member:update');
  const { memberId } = await params;

  const container = createServerContainer();
  const member = await container.repositories.member.findById(memberId);
  if (!member || member.deletedAt) notFound();

  const boundUpdate = updateMemberAction.bind(null, memberId);
  const boundUpdateSituation = updateMemberSituationAction.bind(null, memberId);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">{member.nomeCompleto}</h1>
        <DeleteMemberButton memberId={member.id} memberName={member.nomeCompleto} />
      </div>

      <Card className="max-w-sm">
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

      <MemberForm action={boundUpdate} member={member} />
    </div>
  );
}
