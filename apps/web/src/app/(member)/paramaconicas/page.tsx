import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { FRATERNAL_AFFILIATION_LABELS, type FraternalAffiliationKind } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import {
  ArchiveItemCard,
  ArrowLeft,
  EmptyState,
  FilterBar,
  Handshake,
  Lock,
  ShieldCheck,
  Users,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { ParamasonicMemberCard } from '@/modules/family-legacy/components/paramasonic-member-card';

function buildHref(affiliationKind?: string): string {
  return affiliationKind
    ? `/paramaconicas?entidade=${encodeURIComponent(affiliationKind)}`
    : '/paramaconicas';
}

/**
 * Comunidade Paramaçônica VL6 — ponto único pra tudo relacionado a
 * organizações paramaçônicas (docs/architecture/12), com duas seções por
 * papel de acesso:
 *
 * - "Diretório institucional" (`listParamasonicMemberDirectory`): recorte
 *   seguro dos Irmãos ativos, visível a qualquer conta com
 *   `paramasonicCommunity:read` — inclui o papel `paramaconica`, convidado
 *   externo de menor privilégio (docs/architecture/12 §12.3).
 * - "Vínculos Paramaçônicos" (`listParamasonicDirectory`): Irmãos e
 *   familiares com afiliação cadastrada a uma ordem paramaçônica (DeMolay,
 *   Filhas de Jó etc.) — exige `familyLegacy:read`, que o papel
 *   `paramaconica` deliberadamente não tem (exporia dados de família a um
 *   convidado externo). Só aparece pra Irmãos/Administração.
 */
export default async function ParamasonicCommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ entidade?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (!hasPermission(session.authContext, 'paramasonicCommunity:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Área Paramaçônica indisponível"
        description="Este conteúdo é restrito a pessoas previamente autorizadas pela Verdadeira Luz nº 06."
      />
    );
  }

  const container = createServerContainer();
  const canSeeVinculos = hasPermission(session.authContext, 'familyLegacy:read');

  const [members, vinculos] = await Promise.all([
    container.useCases.listParamasonicMemberDirectory.execute(session.authContext),
    canSeeVinculos
      ? container.useCases.listParamasonicDirectory.execute(session.authContext)
      : Promise.resolve([]),
  ]);

  const entidadesPresentes = [
    ...new Set(vinculos.map((v) => v.affiliationKind)),
  ] as FraternalAffiliationKind[];
  const filterItems = entidadesPresentes.map((affiliationKind) => ({
    value: affiliationKind,
    label: FRATERNAL_AFFILIATION_LABELS[affiliationKind],
    href: buildHref(params.entidade === affiliationKind ? undefined : affiliationKind),
  }));
  const filteredVinculos = params.entidade
    ? vinculos.filter((v) => v.affiliationKind === params.entidade)
    : vinculos;

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8">
      {hasPermission(session.authContext, 'memberDirectory:read') && (
        <Link
          href="/irmaos"
          className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar à Comunidade VL6
        </Link>
      )}

      <header className="border-border from-primary-dark to-primary relative overflow-hidden rounded-2xl border bg-gradient-to-br p-6 text-white shadow-sm sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <span className="text-accent flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]">
            <Handshake size={16} />
            Família Maçônica
          </span>
          <h1 className="font-display mt-3 text-3xl font-semibold">Comunidade Paramaçônica VL6</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
            Um espaço de aproximação entre a Verdadeira Luz nº 06 e as organizações irmãs, liberado
            de forma gradual e responsável pela Administração da Loja.
          </p>
        </div>
        <Handshake
          aria-hidden
          size={180}
          strokeWidth={0.8}
          className="absolute -bottom-12 -right-8 text-white/10"
        />
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="border-border bg-surface rounded-xl border p-4">
          <ShieldCheck className="text-accent" size={20} />
          <h2 className="font-display mt-2 font-semibold">Acesso protegido</h2>
          <p className="text-muted mt-1 text-sm">Cada conta recebe somente as áreas autorizadas.</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <Users className="text-accent" size={20} />
          <h2 className="font-display mt-2 font-semibold">Diretório institucional</h2>
          <p className="text-muted mt-1 text-sm">Conheça os Irmãos e suas atuações publicadas.</p>
        </div>
        <div className="border-border bg-surface rounded-xl border p-4">
          <Handshake className="text-accent" size={20} />
          <h2 className="font-display mt-2 font-semibold">Integração gradual</h2>
          <p className="text-muted mt-1 text-sm">
            Novos conteúdos serão liberados conforme a necessidade.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div>
          <span className="text-accent text-xs font-semibold uppercase tracking-wide">
            Diretório
          </span>
          <h2 className="font-display text-2xl font-semibold">Irmãos da Verdadeira Luz nº 06</h2>
          <p className="text-muted mt-1 text-sm">
            São exibidos apenas dados institucionais e informações voluntariamente publicadas por
            cada Irmão. Informações maçônicas internas e contatos pessoais permanecem protegidos.
          </p>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.75} />}
            title="Diretório ainda sem registros disponíveis"
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <ParamasonicMemberCard key={member.memberId} member={member} />
            ))}
          </div>
        )}
      </section>

      {canSeeVinculos && (
        <section className="flex flex-col gap-4">
          <div>
            <span className="text-accent text-xs font-semibold uppercase tracking-wide">
              Família e Legado
            </span>
            <h2 className="font-display text-2xl font-semibold">Vínculos Paramaçônicos</h2>
            <p className="text-muted mt-1 text-sm">
              Irmãos e familiares vinculados a ordens paramaçônicas — DeMolay, Filhas de Jó, Estrela
              do Oriente, Arco-Íris, Fraternidade Feminina e demais organizações irmãs da Loja.
              Visível apenas para Irmãos e Administração.
            </p>
          </div>

          {filterItems.length > 0 && (
            <FilterBar
              items={filterItems}
              activeValue={params.entidade}
              ariaLabel="Filtrar por entidade paramaçônica"
              linkComponent={Link}
            />
          )}

          {filteredVinculos.length === 0 ? (
            <EmptyState
              icon={<Handshake size={22} strokeWidth={1.75} />}
              title="Nenhum vínculo paramaçônico cadastrado ainda"
              description="Vínculos com DeMolay, Filhas de Jó, Estrela do Oriente, Fraternidade Feminina e outras organizações irmãs aparecerão aqui assim que forem cadastrados em Família e Legado."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVinculos.map((entry) => {
                const descricaoPartes = [
                  entry.unidadeNome,
                  entry.organizacaoNome,
                  [entry.cidade, entry.estado].filter(Boolean).join(' - '),
                ].filter(Boolean);
                const descricao = descricaoPartes.length > 0 ? descricaoPartes.join(' · ') : null;
                const icon = <Handshake size={14} strokeWidth={1.75} className="shrink-0" />;

                return entry.personKind === 'member' ? (
                  <ArchiveItemCard
                    key={entry.recordId}
                    href={`/irmaos/${entry.personId}#trajetoria`}
                    kindLabel={FRATERNAL_AFFILIATION_LABELS[entry.affiliationKind]}
                    icon={icon}
                    titulo={entry.nomeCompleto}
                    descricao={descricao}
                    linkComponent={Link}
                  />
                ) : (
                  <div
                    key={entry.recordId}
                    className="border-border rounded-lg border p-4 text-left"
                  >
                    <div className="text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                      {icon}
                      {FRATERNAL_AFFILIATION_LABELS[entry.affiliationKind]}
                    </div>
                    <h3 className="font-display mt-2 line-clamp-2 font-semibold">
                      {entry.nomeCompleto}
                    </h3>
                    {descricao && (
                      <p className="text-muted mt-1 line-clamp-2 text-xs leading-5">{descricao}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
