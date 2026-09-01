import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, CardHeader, CardTitle } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  updateMemberIdentityAction,
  updateMemberProfileAction,
} from '@/modules/membership/actions/member-actions';
import { DeleteMemberButton } from '@/modules/membership/components/delete-member-button';
import { AccessCard } from '@/modules/membership/components/access-card';
import { MemberIdentityCard } from '@/modules/membership/components/admin-only/member-identity-card';
import { MemberMasonicDataCard } from '@/modules/membership/components/admin-only/member-masonic-data-card';
import { MemberNotesCard } from '@/modules/membership/components/admin-only/member-notes-card';
import { AddressMaritalCard } from '@/modules/membership/components/profile-fields/address-marital-card';
import { ProfessionalCard } from '@/modules/membership/components/profile-fields/professional-card';
import { CompanyCard } from '@/modules/membership/components/profile-fields/company-card';
import { ContactsCard } from '@/modules/membership/components/profile-fields/contacts-card';
import { SituacaoMaconicaCard } from '@/modules/membership/components/situacao/situacao-maconica-card';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { listUsedCompanies } from '@/modules/membership/lib/list-used-companies';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';

/**
 * Corpo completo de edição de um Irmão (permissão + fetch + os 9 cartões) —
 * compartilhado entre a página cheia (`/admin/pessoas/irmaos/[memberId]`) e
 * o painel lateral aberto a partir da listagem (rota interceptada
 * `@drawer/(.)[memberId]`). Nenhuma das duas telas duplica essa lógica;
 * a única diferença é o wrapper visual (página vs. `DrawerContent`).
 */
export async function MemberEditPanel({ memberId }: { memberId: string }) {
  const session = await requirePagePermission('member:update');

  const container = createServerContainer();
  const member = await container.repositories.member.findById(memberId);
  if (!member || member.deletedAt) notFound();

  const [
    roles,
    accessUser,
    customProfessions,
    customCompanies,
    situacaoVigente,
    situacaoHistorico,
  ] = await Promise.all([
    container.useCases.listRoles.execute(session.authContext),
    member.userId ? container.repositories.user.findById(member.userId) : Promise.resolve(null),
    listUsedProfessions(container, session.authContext),
    listUsedCompanies(container, session.authContext),
    container.repositories.memberSituationRecord.findVigenteByMemberId(memberId),
    container.repositories.memberSituationRecord.listByMemberId(memberId),
  ]);
  const isSelf = accessUser?.id === session.authContext.uid;

  const boundUpdateProfile = updateMemberProfileAction.bind(null, memberId);
  const boundUpdateIdentity = updateMemberIdentityAction.bind(null, memberId);

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

      <SituacaoMaconicaCard
        member={member}
        vigente={situacaoVigente}
        historico={situacaoHistorico}
      />

      <Card>
        <CardHeader>
          <CardTitle>Acesso ao Portal</CardTitle>
        </CardHeader>
        <CardContent>
          <AccessCard memberId={member.id} roles={roles} accessUser={accessUser} isSelf={isSelf} />
        </CardContent>
      </Card>

      <div className="flex max-w-3xl flex-col gap-4">
        <MemberIdentityCard member={member} action={boundUpdateIdentity} />
        <MemberMasonicDataCard member={member} action={boundUpdateIdentity} />
        <AddressMaritalCard member={member} action={boundUpdateProfile} />
        <ProfessionalCard
          member={member}
          action={boundUpdateProfile}
          customProfessions={customProfessions}
        />
        <CompanyCard member={member} action={boundUpdateProfile} knownCompanies={customCompanies} />
        <ContactsCard member={member} action={boundUpdateProfile} />
        <MemberNotesCard member={member} action={boundUpdateIdentity} />
      </div>
    </div>
  );
}
