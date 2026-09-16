import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { FRATERNAL_AFFILIATION_LABELS, type FraternalAffiliationKind } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, ArrowLeft, EmptyState, FilterBar, Handshake, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';

function buildHref(affiliationKind?: string): string {
  return affiliationKind
    ? `/irmaos/paramaconicas?entidade=${encodeURIComponent(affiliationKind)}`
    : '/irmaos/paramaconicas';
}

/**
 * Diretório de Paramaçônicas — vitrine institucional de toda pessoa com
 * vínculo a uma ordem paramaçônica cadastrada (DeMolay, Filhas de Jó,
 * Estrela do Oriente, Arco-Íris, Fraternidade Feminina, Lowton, outra) —
 * nunca lista `affiliationKind === 'mason'` (isso já é o Diretório de
 * Irmãos). Mesma leitura pública já usada na Galeria de Honra: qualquer
 * Irmão com `familyLegacy:read` vê, cadastro continua exclusivo de Meu
 * Espaço/Família e Legado (`familyLegacy:manage`/ação pessoal).
 */
export default async function ParamasonicDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ entidade?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (!hasPermission(session.authContext, 'familyLegacy:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Diretório de Paramaçônicas indisponível"
        description="Sua função não tem acesso ao Diretório de Paramaçônicas."
      />
    );
  }

  const container = createServerContainer();
  const entries = await container.useCases.listParamasonicDirectory.execute(session.authContext);

  const entidadesPresentes = [
    ...new Set(entries.map((e) => e.affiliationKind)),
  ] as FraternalAffiliationKind[];
  const filterItems = entidadesPresentes.map((affiliationKind) => ({
    value: affiliationKind,
    label: FRATERNAL_AFFILIATION_LABELS[affiliationKind],
    href: buildHref(params.entidade === affiliationKind ? undefined : affiliationKind),
  }));
  const filteredEntries = params.entidade
    ? entries.filter((e) => e.affiliationKind === params.entidade)
    : entries;

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <Link
        href="/irmaos"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Voltar à Comunidade VL6
      </Link>

      <div>
        <span className="text-accent text-xs font-semibold uppercase tracking-wide">
          Família e Legado
        </span>
        <h1 className="font-display text-2xl font-semibold">Diretório de Paramaçônicas</h1>
        <p className="text-muted mt-1 text-sm">
          Irmãos e familiares vinculados a ordens paramaçônicas — DeMolay, Filhas de Jó, Estrela do
          Oriente, Arco-Íris, Fraternidade Feminina e demais organizações irmãs da Loja.
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

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={<Handshake size={22} strokeWidth={1.75} />}
          title="Nenhum vínculo paramaçônico cadastrado ainda"
          description="Vínculos com DeMolay, Filhas de Jó, Estrela do Oriente, Fraternidade Feminina e outras organizações irmãs aparecerão aqui assim que forem cadastrados em Família e Legado."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEntries.map((entry) => {
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
              <div key={entry.recordId} className="border-border rounded-lg border p-4 text-left">
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
    </div>
  );
}
