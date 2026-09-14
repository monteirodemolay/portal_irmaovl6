import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import { HONOR_TYPE_LABELS, type HonorTypeKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { ArchiveItemCard, ArrowLeft, Award, EmptyState, FilterBar, Lock } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';

function buildHref(tipo?: string): string {
  return tipo
    ? `/irmaos/galeria-de-honra?tipo=${encodeURIComponent(tipo)}`
    : '/irmaos/galeria-de-honra';
}

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : 'data não registrada';
}

/**
 * Galeria de Honra VL6 (Fase 4 do plano de Honrarias) — vitrine
 * institucional de todas as Honrarias e Condecorações concedidas (§3, §5 e
 * §6 do levantamento), a um Irmão cadastrado ou a um homenageado externo.
 * Leitura só (`honor:read`, o mesmo gate de "Trajetória e Honrarias" no
 * Perfil); cadastro continua exclusivo do `MemberEditPanel`
 * (`honor:manage`).
 */
export default async function HonorGalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requireSession();
  const params = await searchParams;

  if (!hasPermission(session.authContext, 'honor:read')) {
    return (
      <EmptyState
        icon={<Lock size={22} strokeWidth={1.75} />}
        title="Galeria de Honra indisponível"
        description="Sua função não tem acesso à Galeria de Honra VL6."
      />
    );
  }

  const container = createServerContainer();
  const honors = await container.useCases.listHonorGallery.execute(session.authContext);

  const memberIds = [...new Set(honors.map((h) => h.memberId).filter((id): id is string => !!id))];
  const members = await Promise.all(
    memberIds.map((id) => container.repositories.member.findById(id)),
  );
  const memberNameById = new Map(
    members.filter((m) => m !== null).map((m) => [m!.id, m!.nomeCompleto]),
  );

  const tiposPresentes = [...new Set(honors.map((h) => h.tipo))] as HonorTypeKey[];
  const filterItems = tiposPresentes.map((tipo) => ({
    value: tipo,
    label: HONOR_TYPE_LABELS[tipo],
    href: buildHref(params.tipo === tipo ? undefined : tipo),
  }));
  const filteredHonors = params.tipo ? honors.filter((h) => h.tipo === params.tipo) : honors;

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
          Acervo Histórico
        </span>
        <h1 className="font-display text-2xl font-semibold">Galeria de Honra VL6</h1>
        <p className="text-muted mt-1 text-sm">
          Medalhas, comendas, diplomas e distinções concedidas a Irmãos da Loja e a homenageados
          externos ao longo da história da Verdadeira Luz nº 06.
        </p>
      </div>

      {filterItems.length > 0 && (
        <FilterBar
          items={filterItems}
          activeValue={params.tipo}
          ariaLabel="Filtrar por tipo de honraria"
          linkComponent={Link}
        />
      )}

      {filteredHonors.length === 0 ? (
        <EmptyState
          icon={<Award size={22} strokeWidth={1.75} />}
          title="Nenhuma honraria cadastrada ainda"
          description="Medalhas, comendas e distinções concedidas pela ou à Loja aparecerão aqui assim que forem cadastradas."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredHonors.map((honor) => {
            const homenageado = honor.memberId
              ? (memberNameById.get(honor.memberId) ?? 'Irmão')
              : honor.homenageadoNome;
            const descricao = `${homenageado} · ${honor.instituicaoConcedente} · ${formatDate(honor.data)}`;
            return honor.memberId ? (
              <ArchiveItemCard
                key={honor.id}
                href={`/irmaos/${honor.memberId}?aba=trajetoria`}
                kindLabel={HONOR_TYPE_LABELS[honor.tipo]}
                icon={<Award size={14} />}
                titulo={honor.nomeOficial}
                descricao={descricao}
                linkComponent={Link}
              />
            ) : (
              <div key={honor.id} className="border-border rounded-lg border p-4 text-left">
                <div className="text-accent flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider">
                  <Award size={14} />
                  {HONOR_TYPE_LABELS[honor.tipo]}
                </div>
                <h3 className="font-display mt-2 line-clamp-2 font-semibold">
                  {honor.nomeOficial}
                </h3>
                <p className="text-muted mt-1 line-clamp-2 text-xs leading-5">{descricao}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
