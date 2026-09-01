import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ClipboardList,
  Eye,
  UserCog,
} from '@vl6/ui';
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
import { CollapsibleSection } from '@/components/forms/collapsible-section';
import { PreviewAsOthersDialog } from '../meu-espaco/preview-as-others-dialog';
import { AssistedContentSections } from './assisted-content-sections';
import { ConsentActionsPanel } from './consent-actions-panel';
import { HistoryPanel } from './history-panel';
import {
  ReactivateCentralProfileButton,
  SuspendCentralProfileButton,
} from '../central-moderation-actions';

/**
 * Editor completo de um Irmão em `/admin/pessoas/irmaos/[memberId]` —
 * reorganizado em 8 seções recolhíveis (Fase 2, docs/architecture),
 * substituindo a antiga sequência de cartões idênticos por seções com
 * resumo/estado próprio. O painel lateral de edição rápida
 * (`@drawer/(.)[memberId]`) continua usando `MemberEditPanel` — este
 * componente é só da página cheia, onde o cadastro assistido faz sentido
 * (fluxo mais longo, com consentimento e publicação).
 */
export async function AssistedMemberEditor({ memberId }: { memberId: string }) {
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
    profile,
    settings,
    consentHistory,
    previewResult,
  ] = await Promise.all([
    container.useCases.listRoles.execute(session.authContext),
    member.userId ? container.repositories.user.findById(member.userId) : Promise.resolve(null),
    listUsedProfessions(container, session.authContext),
    listUsedCompanies(container, session.authContext),
    container.repositories.memberSituationRecord.findVigenteByMemberId(memberId),
    container.repositories.memberSituationRecord.listByMemberId(memberId),
    container.repositories.memberCentralProfile.findByMemberId(
      session.authContext.tenantId,
      memberId,
    ),
    container.repositories.publicationSettings.findByMemberId(
      session.authContext.tenantId,
      memberId,
    ),
    container.repositories.publicationConsent.listByMemberId(
      session.authContext.tenantId,
      memberId,
    ),
    // `getPublicMemberProfile` exige `memberDirectory:read` — nem todo papel
    // com `member:update` necessariamente tem essa outra permissão; falha
    // aqui só esconde o botão de preview, nunca derruba a página inteira.
    container.useCases.getPublicMemberProfile
      .execute(session.authContext, memberId)
      .catch(() => null),
  ]);
  const isSelf = accessUser?.id === session.authContext.uid;

  const [profileAudit, settingsAudit] = await Promise.all([
    profile
      ? container.repositories.auditLog.search(
          {
            tenantId: session.authContext.tenantId,
            entidade: 'memberCentralProfiles',
            entidadeId: profile.id,
          },
          { limit: 50 },
        )
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
    settings
      ? container.repositories.auditLog.search(
          {
            tenantId: session.authContext.tenantId,
            entidade: 'publicationSettings',
            entidadeId: settings.id,
          },
          { limit: 50 },
        )
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
  ]);

  const boundUpdateProfile = updateMemberProfileAction.bind(null, memberId);
  const boundUpdateIdentity = updateMemberIdentityAction.bind(null, memberId);

  const completude = [
    profile?.apresentacao,
    profile?.areaAtuacao,
    profile?.competencias.length ? 'x' : null,
    profile?.negocios.length ? 'x' : null,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MemberAvatar fotoUrl={member.fotoUrl} nome={member.nomeCompleto} className="h-12 w-12" />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold">{member.nomeCompleto}</h1>
            <div className="flex items-center gap-2">
              <MemberDegreeBadge grau={member.grau} compact />
              <span className="text-muted text-xs">
                Diretório: {completude}/4 blocos preenchidos
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/irmaos/${memberId}`}>
              <Eye size={14} />
              Ver no Diretório
            </Link>
          </Button>
          {previewResult?.ok && previewResult.value && (
            <PreviewAsOthersDialog previewDto={previewResult.value} />
          )}
          <DeleteMemberButton memberId={member.id} memberName={member.nomeCompleto} />
        </div>
      </div>

      <CollapsibleSection
        icon={UserCog}
        title="Identificação institucional"
        description="Dados básicos do cadastro — nome, foto, acesso ao Portal."
        defaultOpen
      >
        <div className="flex flex-col gap-4">
          <MemberIdentityCard member={member} action={boundUpdateIdentity} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acesso ao Portal</CardTitle>
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
      </CollapsibleSection>

      <CollapsibleSection
        icon={ClipboardList}
        title="Vida maçônica e situação"
        description="Grau, datas e situação atual — histórico de ocorrências GLEG fica para uma fase futura."
      >
        <div className="flex flex-col gap-4">
          <SituacaoMaconicaCard
            member={member}
            vigente={situacaoVigente}
            historico={situacaoHistorico}
          />
          <MemberMasonicDataCard member={member} action={boundUpdateIdentity} />
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        icon={UserCog}
        title="Atuação profissional"
        description="Profissão institucional e endereço — separado do conteúdo voluntário do Diretório."
      >
        <div className="flex flex-col gap-4">
          <ProfessionalCard
            member={member}
            action={boundUpdateProfile}
            customProfessions={customProfessions}
          />
          <AddressMaritalCard member={member} action={boundUpdateProfile} />
        </div>
      </CollapsibleSection>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Preencher perfil assistido</h2>
        </div>
        <p className="text-muted text-sm">
          Preenchido aqui pela Administração, este conteúdo fica como rascunho — só aparece no
          Diretório depois de consentimento registrado e publicação explícita (seção
          &ldquo;Privacidade e consentimento&rdquo;, abaixo).
        </p>
        <AssistedContentSections memberId={memberId} profile={profile} />
      </div>

      <CollapsibleSection
        icon={UserCog}
        title="Contatos e redes (institucional)"
        description="Telefone, WhatsApp e e-mail cadastrados — visibilidade de cada um é controlada na seção de privacidade."
      >
        <ContactsCard member={member} action={boundUpdateProfile} />
        <CompanyCard member={member} action={boundUpdateProfile} knownCompanies={customCompanies} />
      </CollapsibleSection>

      <CollapsibleSection
        icon={UserCog}
        title="Privacidade e consentimento"
        description="Registrar consentimento, publicar blocos autorizados ou revogar — sempre rastreado."
      >
        <ConsentActionsPanel
          memberId={memberId}
          settings={settings}
          consentHistory={consentHistory}
        />
        <div className="border-border flex flex-wrap items-center gap-2 border-t pt-4">
          <span className="text-muted text-xs font-semibold uppercase tracking-wide">
            Moderação administrativa
          </span>
          {settings?.suspendedAt ? (
            <ReactivateCentralProfileButton memberId={memberId} />
          ) : (
            <SuspendCentralProfileButton memberId={memberId} memberName={member.nomeCompleto} />
          )}
        </div>
      </CollapsibleSection>

      <HistoryPanel
        auditEntries={[...profileAudit.items, ...settingsAudit.items]}
        consentHistory={consentHistory}
      />

      <CollapsibleSection
        icon={UserCog}
        title="Anotações internas"
        description="Visível só para a Administração."
      >
        <MemberNotesCard member={member} action={boundUpdateIdentity} />
      </CollapsibleSection>
    </div>
  );
}
