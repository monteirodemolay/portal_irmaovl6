import { buildPublicMemberProfileDTO, type PublicationSettings } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { ContatosTab } from '@/modules/central/components/meu-espaco/contatos-tab';
import { EmpresaTab } from '@/modules/central/components/meu-espaco/empresa-tab';
import { GeralTab } from '@/modules/central/components/meu-espaco/geral-tab';
import { PessoalTab } from '@/modules/central/components/meu-espaco/pessoal-tab';
import { PrivacidadeTab } from '@/modules/central/components/meu-espaco/privacidade-tab';
import { ProfissionalTab } from '@/modules/central/components/meu-espaco/profissional-tab';
import { RedesTab } from '@/modules/central/components/meu-espaco/redes-tab';
import { SpaceHeader } from '@/modules/central/components/meu-espaco/space-header';

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
    competencias: false,
    servicos: false,
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

export default async function MeuEspacoPage() {
  const session = await requireSession();
  const container = createServerContainer();

  const [member, myCommittees, customProfessions] = await Promise.all([
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    container.useCases.listMyCommittees.execute(session.authContext),
    listUsedProfessions(container, session.authContext),
  ]);

  if (!member) {
    return (
      <Card className="max-w-md">
        <CardContent className="text-muted p-6 text-sm">
          Sua conta ainda não está vinculada a um cadastro de Irmão. Fale com a Secretaria da Loja
          para vincular seu usuário ao seu registro.
        </CardContent>
      </Card>
    );
  }

  const [centralProfile, publicationSettings] = await Promise.all([
    container.repositories.memberCentralProfile.findByMemberId(
      session.authContext.tenantId,
      member.id,
    ),
    container.repositories.publicationSettings.findByMemberId(
      session.authContext.tenantId,
      member.id,
    ),
  ]);

  const previewDto = buildPublicMemberProfileDTO(
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
  );

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <SpaceHeader
        member={member}
        profile={centralProfile}
        profilePublished={publicationSettings?.profilePublished ?? false}
        previewDto={previewDto}
      />

      <Tabs defaultValue="geral">
        <TabsList className="flex-wrap">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
          <TabsTrigger value="profissional">Profissional</TabsTrigger>
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="contatos">Contatos</TabsTrigger>
          <TabsTrigger value="redes">Redes</TabsTrigger>
          <TabsTrigger value="privacidade">Privacidade</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="pt-6">
          <GeralTab member={member} profile={centralProfile} myCommittees={myCommittees} />
        </TabsContent>
        <TabsContent value="pessoal" className="pt-6">
          <PessoalTab member={member} profile={centralProfile} />
        </TabsContent>
        <TabsContent value="profissional" className="pt-6">
          <ProfissionalTab
            member={member}
            profile={centralProfile}
            customProfessions={customProfessions}
          />
        </TabsContent>
        <TabsContent value="empresa" className="pt-6">
          <EmpresaTab member={member} profile={centralProfile} />
        </TabsContent>
        <TabsContent value="contatos" className="pt-6">
          <ContatosTab member={member} settings={publicationSettings} />
        </TabsContent>
        <TabsContent value="redes" className="pt-6">
          <RedesTab profile={centralProfile} settings={publicationSettings} />
        </TabsContent>
        <TabsContent value="privacidade" className="pt-6">
          <PrivacidadeTab settings={publicationSettings} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
