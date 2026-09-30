import Link from 'next/link';
import { buildPublicMemberProfileDTO, hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Card,
  CardContent,
  ChevronRight,
  Handshake,
  Heart,
  Phone,
  Settings,
  Share2,
  Sparkles,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { listUsedCompanies } from '@/modules/membership/lib/list-used-companies';
import { listUsedInstitutions } from '@/modules/membership/lib/list-used-institutions';
import { listUsedBusinessNames } from '@/modules/central/lib/list-used-business-names';
import { AfiliacoesTab } from '@/modules/central/components/meu-espaco/afiliacoes-tab';
import { ContatosTab } from '@/modules/central/components/meu-espaco/contatos-tab';
import { EmpresaTab } from '@/modules/central/components/meu-espaco/empresa-tab';
import { GeralTab } from '@/modules/central/components/meu-espaco/geral-tab';
import { PessoalTab } from '@/modules/central/components/meu-espaco/pessoal-tab';
import {
  EMPTY_OWNER_FAMILY_NETWORK,
  loadOwnerFamilyNetworkDTO,
} from '@/modules/family-legacy/lib/load-owner-family-network-dto';
import { ProfissionalTab } from '@/modules/central/components/meu-espaco/profissional-tab';
import { RedesTab } from '@/modules/central/components/meu-espaco/redes-tab';
import { SpaceHeader } from '@/modules/central/components/meu-espaco/space-header';

const EDIT_SECTIONS = [
  { id: 'geral', label: 'Sobre mim', icon: Sparkles },
  { id: 'pessoal', label: 'Família e dados pessoais', icon: Heart },
  { id: 'profissional', label: 'Vida profissional', icon: Briefcase },
  { id: 'empresa', label: 'Empresas e negócios', icon: Building2 },
  { id: 'afiliacoes', label: 'Afiliações', icon: Handshake },
  { id: 'contatos', label: 'Contatos', icon: Phone },
  { id: 'redes', label: 'Redes e links', icon: Share2 },
] as const;

function EditorSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="text-muted mt-1 text-sm">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default async function MeuEspacoPage() {
  const session = await requireSession();
  const container = createServerContainer();

  const [
    member,
    myCommittees,
    customProfessions,
    businessNames,
    knownCompanies,
    knownInstitutions,
  ] = await Promise.all([
    container.repositories.member.findByUserId(session.authContext.tenantId, session.user.id),
    container.useCases.listMyCommittees.execute(session.authContext),
    listUsedProfessions(container, session.authContext),
    listUsedBusinessNames(container, session.authContext),
    listUsedCompanies(container, session.authContext),
    listUsedInstitutions(container, session.authContext),
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

  const familyNetwork = hasPermission(session.authContext, 'familyLegacy:read')
    ? await loadOwnerFamilyNetworkDTO(container, session.authContext, member.id)
    : EMPTY_OWNER_FAMILY_NETWORK;

  const sharedFamilyPersonsResult = hasPermission(session.authContext, 'familyLegacy:read')
    ? await container.useCases.findSharedFamilyPersons.execute(session.authContext, member.id)
    : null;
  const sharedFamilyPersons = sharedFamilyPersonsResult?.ok ? sharedFamilyPersonsResult.value : [];

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

  const previewDto = buildPublicMemberProfileDTO(member, centralProfile, publicationSettings);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/irmaos/${member.id}`}
          className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao meu perfil
        </Link>
        <Link
          href="/configuracoes#perfil-diretorio"
          className="text-muted hover:text-primary flex items-center gap-1.5 text-sm transition-colors"
        >
          <Settings size={15} />
          Privacidade e visibilidade
        </Link>
      </div>

      <SpaceHeader
        member={member}
        profile={centralProfile}
        profilePublished={publicationSettings?.profilePublished ?? true}
        previewDto={previewDto}
      />

      <Card id="perfil-editor" className="overflow-hidden">
        <CardContent className="p-0">
          <div className="border-border-soft border-b px-5 py-4 sm:px-6">
            <p className="text-primary text-xs font-bold uppercase tracking-[0.14em]">Meu Perfil</p>
            <h1 className="font-display mt-1 text-2xl font-semibold">Editar informações do perfil</h1>
            <p className="text-muted mt-1 max-w-3xl text-sm leading-6">
              Edite somente os dados que desejar. As informações institucionais da Loja continuam
              protegidas e são mantidas pela Secretaria. Privacidade e visibilidade agora ficam em
              Configurações.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-7">
            {EDIT_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="border-border bg-background hover:border-primary hover:text-primary flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-colors"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <section.icon size={15} className="shrink-0" />
                  <span className="truncate">{section.label}</span>
                </span>
                <ChevronRight size={13} className="shrink-0 opacity-60" />
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <EditorSection
          id="geral"
          title="Sobre mim"
          description="Apresentação, dados maçônicos e comissões. Os dados institucionais são somente leitura."
        >
          <GeralTab member={member} profile={centralProfile} myCommittees={myCommittees} />
        </EditorSection>

        <EditorSection
          id="pessoal"
          title="Família e dados pessoais"
          description="Dados pessoais, endereço, cônjuge, filhos, família e vivência maçônica complementar."
        >
          <PessoalTab
            member={member}
            profile={centralProfile}
            familyNetwork={familyNetwork}
            sharedFamilyPersons={sharedFamilyPersons}
          />
        </EditorSection>
      </div>

      <EditorSection
        id="profissional"
        title="Vida profissional"
        description="Profissão, atuação, histórico profissional, formação acadêmica, competências e serviços."
      >
        <ProfissionalTab
          member={member}
          profile={centralProfile}
          customProfessions={customProfessions}
          knownCompanies={knownCompanies}
          knownInstitutions={knownInstitutions}
        />
      </EditorSection>

      <EditorSection
        id="empresa"
        title="Empresas e negócios"
        description="Cadastre e mantenha os negócios e serviços que podem compor sua apresentação no Portal."
      >
        <EmpresaTab profile={centralProfile} knownBusinessNames={businessNames} />
      </EditorSection>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <EditorSection
          id="afiliacoes"
          title="Afiliações"
          description="Associações, instituições e demais vínculos voluntários."
        >
          <AfiliacoesTab profile={centralProfile} />
        </EditorSection>

        <div className="flex flex-col gap-6">
          <EditorSection
            id="contatos"
            title="Contatos"
            description="Telefone, WhatsApp e informações de contato vinculadas ao cadastro."
          >
            <ContatosTab member={member} settings={publicationSettings} />
          </EditorSection>

          <EditorSection
            id="redes"
            title="Redes e links"
            description="Instagram, Facebook, LinkedIn, Lattes, site e demais perfis externos."
          >
            <RedesTab profile={centralProfile} settings={publicationSettings} />
          </EditorSection>
        </div>
      </div>

      <div className="border-accent/40 bg-accent/10 flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display font-semibold">Privacidade saiu da edição do perfil</p>
          <p className="text-muted mt-1 text-sm">
            Defina o que os outros Irmãos podem visualizar em Configurações → Perfil e Diretório.
          </p>
        </div>
        <Link
          href="/configuracoes#perfil-diretorio"
          className="bg-primary hover:bg-primary-dark w-fit rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors"
        >
          Abrir configurações
        </Link>
      </div>
    </div>
  );
}
