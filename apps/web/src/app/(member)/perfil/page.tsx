import { createServerContainer } from '@vl6/infra';
import { buildPublicMemberProfileDTO, type PublicationSettings } from '@vl6/domain';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { SelfProfileForm } from '@/modules/membership/components/self-profile-form';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { CentralProfileTab } from '@/modules/central/components/central-profile-tab';

const EMPTY_PUBLICATION_SETTINGS: Omit<
  PublicationSettings,
  'id' | 'tenantId' | 'memberId' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
> = {
  profilePublished: false,
  blocks: {
    apresentacao: false,
    informacoesPessoais: false,
    profissional: false,
    empresa: false,
    informacoesMaconicas: false,
  },
  contacts: { telefone: false, whatsapp: false, email: false },
  externalLinks: {
    whatsapp: false,
    instagram: false,
    facebook: false,
    linkedin: false,
    lattes: false,
    site: false,
  },
  suspendedAt: null,
  suspendedBy: null,
  suspendedReason: null,
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

export default async function ProfilePage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);

  const container = createServerContainer();
  const [member, myCommittees, customProfessions] = await Promise.all([
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    container.useCases.listMyCommittees.execute(session.authContext),
    listUsedProfessions(container, session.authContext),
  ]);

  const [centralProfile, publicationSettings] = member
    ? await Promise.all([
        container.repositories.memberCentralProfile.findByMemberId(
          session.authContext.tenantId,
          member.id,
        ),
        container.repositories.publicationSettings.findByMemberId(
          session.authContext.tenantId,
          member.id,
        ),
      ])
    : [null, null];

  const previewDto = member
    ? buildPublicMemberProfileDTO(
        member,
        centralProfile,
        publicationSettings ?? {
          ...EMPTY_PUBLICATION_SETTINGS,
          id: '',
          tenantId: member.tenantId,
          memberId: member.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: member.id,
          updatedBy: member.id,
        },
      )
    : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Meu Perfil</h1>

      <Tabs defaultValue="cadastro">
        <TabsList>
          <TabsTrigger value="cadastro">Meu Cadastro</TabsTrigger>
          <TabsTrigger value="central">Central VL6</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro" className="flex flex-col gap-6 pt-6">
          {member ? (
            <>
              <Card>
                <CardContent className="flex flex-col gap-6 p-6">
                  <div className="flex items-center gap-4">
                    <MemberAvatar
                      fotoUrl={member.fotoUrl}
                      nome={member.nomeCompleto}
                      className="h-16 w-16"
                    />
                    <div className="flex flex-col gap-1.5">
                      <p className="font-display text-xl font-semibold">{member.nomeCompleto}</p>
                      <p className="text-muted text-sm">{current?.tenant.nome}</p>
                      <MemberDegreeBadge grau={member.grau} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 border-t pt-6 sm:grid-cols-2">
                    <div>
                      <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                        Dados maçônicos
                      </h2>
                      <dl className="flex flex-col gap-1.5 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted">Iniciação</dt>
                          <dd>{formatDate(member.dataIniciacao)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted">Elevação</dt>
                          <dd>{formatDate(member.dataElevacao)}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted">Exaltação</dt>
                          <dd>{formatDate(member.dataExaltacao)}</dd>
                        </div>
                      </dl>
                    </div>
                    <div>
                      <h2 className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                        Dados de acesso
                      </h2>
                      <dl className="flex flex-col gap-1.5 text-sm">
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted">E-mail</dt>
                          <dd className="truncate">{member.email}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <SelfProfileForm member={member} customProfessions={customProfessions} />
            </>
          ) : (
            <Card className="max-w-md">
              <CardContent className="text-muted p-6 text-sm">
                Sua conta ainda não está vinculada a um cadastro de Irmão. Fale com a Secretaria da
                Loja para vincular seu usuário ao seu registro.
              </CardContent>
            </Card>
          )}

          {myCommittees.length > 0 && (
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Minhas Comissões</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {myCommittees.map((committee) => (
                  <Badge key={committee.id} variant="accent">
                    {committee.nome}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="central" className="pt-6">
          {member && previewDto ? (
            <CentralProfileTab
              profile={centralProfile}
              settings={publicationSettings}
              previewDto={previewDto}
            />
          ) : (
            <Card className="max-w-md">
              <CardContent className="text-muted p-6 text-sm">
                Sua conta ainda não está vinculada a um cadastro de Irmão — a Central fica
                disponível assim que houver um cadastro de Irmão vinculado.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
