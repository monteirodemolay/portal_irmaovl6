import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { Pencil, X } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { listUsedProfessions } from '@/modules/membership/lib/list-used-professions';
import { listUsedCompanies } from '@/modules/membership/lib/list-used-companies';
import { listUsedInstitutions } from '@/modules/membership/lib/list-used-institutions';
import { listUsedBusinessNames } from '@/modules/central/lib/list-used-business-names';
import {
  EMPTY_OWNER_FAMILY_NETWORK,
  loadOwnerFamilyNetworkDTO,
} from '@/modules/family-legacy/lib/load-owner-family-network-dto';
import { AfiliacoesTab } from './meu-espaco/afiliacoes-tab';
import { ContatosTab } from './meu-espaco/contatos-tab';
import { EmpresaTab } from './meu-espaco/empresa-tab';
import { GeralTab } from './meu-espaco/geral-tab';
import { PessoalTab } from './meu-espaco/pessoal-tab';
import { ProfissionalTab } from './meu-espaco/profissional-tab';
import { RedesTab } from './meu-espaco/redes-tab';
import type { EditTab } from './profile-shared';

const SECTION_META: Record<EditTab, { title: string; description: string }> = {
  geral: {
    title: 'Apresentação',
    description: 'Edite sua apresentação. Os registros maçônicos continuam sendo mantidos pela Loja.',
  },
  pessoal: {
    title: 'Dados pessoais e família',
    description: 'Atualize os dados pessoais permitidos, endereço, cônjuge e vínculos familiares.',
  },
  profissional: {
    title: 'Vida profissional',
    description: 'Atualize profissão, atuação, formação, histórico, competências e serviços.',
  },
  empresa: {
    title: 'Empresas e negócios',
    description: 'Gerencie os negócios e serviços vinculados ao seu perfil.',
  },
  afiliacoes: {
    title: 'Afiliações',
    description: 'Atualize associações, instituições e demais vínculos voluntários.',
  },
  contatos: {
    title: 'Contatos',
    description: 'Atualize telefone e WhatsApp. A visibilidade é definida em Configurações.',
  },
  redes: {
    title: 'Redes e links',
    description: 'Atualize Instagram, LinkedIn, Lattes, site e demais perfis externos.',
  },
};

export async function OwnerProfileInlineEditor({
  memberId,
  section,
}: {
  memberId: string;
  section: EditTab;
}) {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member || member.id !== memberId) return null;

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

  let content: React.ReactNode = null;

  if (section === 'geral') {
    content = (
      <GeralTab
        member={member}
        profile={centralProfile}
        myCommittees={[]}
        showInstitutional={false}
      />
    );
  }

  if (section === 'pessoal') {
    const familyNetwork = hasPermission(session.authContext, 'familyLegacy:read')
      ? await loadOwnerFamilyNetworkDTO(container, session.authContext, member.id)
      : EMPTY_OWNER_FAMILY_NETWORK;
    const sharedResult = hasPermission(session.authContext, 'familyLegacy:read')
      ? await container.useCases.findSharedFamilyPersons.execute(session.authContext, member.id)
      : null;
    const sharedFamilyPersons = sharedResult?.ok ? sharedResult.value : [];
    content = (
      <PessoalTab
        member={member}
        profile={centralProfile}
        familyNetwork={familyNetwork}
        sharedFamilyPersons={sharedFamilyPersons}
      />
    );
  }

  if (section === 'profissional') {
    const [customProfessions, knownCompanies, knownInstitutions] = await Promise.all([
      listUsedProfessions(container, session.authContext),
      listUsedCompanies(container, session.authContext),
      listUsedInstitutions(container, session.authContext),
    ]);
    content = (
      <ProfissionalTab
        member={member}
        profile={centralProfile}
        customProfessions={customProfessions}
        knownCompanies={knownCompanies}
        knownInstitutions={knownInstitutions}
      />
    );
  }

  if (section === 'empresa') {
    const businessNames = await listUsedBusinessNames(container, session.authContext);
    content = <EmpresaTab profile={centralProfile} knownBusinessNames={businessNames} />;
  }

  if (section === 'afiliacoes') {
    content = <AfiliacoesTab profile={centralProfile} />;
  }

  if (section === 'contatos') {
    content = <ContatosTab member={member} settings={publicationSettings} />;
  }

  if (section === 'redes') {
    content = <RedesTab profile={centralProfile} settings={publicationSettings} />;
  }

  const meta = SECTION_META[section];

  return (
    <section
      id={`editor-${section}`}
      className="border-accent/40 bg-surface scroll-mt-24 overflow-hidden rounded-2xl border shadow-sm ring-1 ring-accent/10"
    >
      <header className="border-border-soft bg-accent/5 flex items-start justify-between gap-4 border-b px-5 py-4">
        <div className="flex min-w-0 gap-3">
          <span className="bg-accent/15 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
            <Pencil size={17} strokeWidth={1.8} />
          </span>
          <div>
            <p className="text-accent text-[10px] font-bold uppercase tracking-[0.14em]">
              Editando no meu perfil
            </p>
            <h2 className="font-display mt-0.5 text-lg font-semibold">{meta.title}</h2>
            <p className="text-muted mt-1 text-xs leading-5">{meta.description}</p>
          </div>
        </div>
        <Link
          href={`/irmaos/${memberId}`}
          className="border-border bg-background text-muted hover:text-foreground flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors"
          aria-label="Fechar edição"
          title="Cancelar edição"
        >
          <X size={15} />
        </Link>
      </header>
      <div className="p-4 sm:p-5">{content}</div>
    </section>
  );
}
