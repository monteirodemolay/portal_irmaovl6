import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { FRATERNAL_AFFILIATION_LABELS, PARAMASONIC_ENTITY_STATUS_LABELS } from '@vl6/shared';
import { Badge, EmptyState, Handshake } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { CreateParamasonicEntityDialog } from '@/modules/family-legacy/components/create-paramasonic-entity-dialog';

function initials(shortName: string): string {
  const words = shortName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '—';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

const STATUS_BADGE_VARIANT = {
  ativa: 'success',
  em_implantacao: 'warning',
  inativa: 'outline',
} as const;

export default async function ParamasonicEntitiesPage() {
  const [session, currentTenant] = await Promise.all([
    requirePagePermission('paramasonicEntity:read'),
    getCurrentTenant(),
  ]);

  const container = createServerContainer();
  const entities = await container.useCases.listParamasonicEntities.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Entidades paramaçônicas</h1>
          <p className="text-muted mt-1 text-sm">
            Páginas próprias, gestão integrada e acesso controlado pela Loja.
          </p>
        </div>
        <CreateParamasonicEntityDialog
          defaultParentUnitName={currentTenant?.tenant.nome ?? 'Loja Verdadeira Luz nº 06'}
        />
      </div>

      {entities.length === 0 ? (
        <EmptyState
          icon={<Handshake size={22} strokeWidth={1.75} />}
          title="Nenhuma entidade paramaçônica cadastrada"
          description="Cadastre DeMolay, Filhas de Jó, Fraternidade Feminina, Castelo, Abelhinhas ou outra organização irmã."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {entities.map((entity) => (
            <Link
              key={entity.id}
              href={`/admin/pessoas/paramaconicas/${entity.id}`}
              className="border-border bg-surface hover:border-primary flex flex-col gap-3 rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="border-accent text-accent bg-surface flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dashed text-sm font-semibold">
                  {initials(entity.shortName)}
                </div>
                <Badge variant={STATUS_BADGE_VARIANT[entity.situacao]}>
                  {PARAMASONIC_ENTITY_STATUS_LABELS[entity.situacao]}
                </Badge>
              </div>
              <div>
                <h2 className="font-display font-semibold leading-tight">{entity.shortName}</h2>
                <p className="text-muted mt-0.5 text-xs">
                  {FRATERNAL_AFFILIATION_LABELS[entity.kind]}
                </p>
              </div>
              <p className="text-muted text-xs leading-5">{entity.name}</p>
              <p className="text-muted mt-auto text-[11px]">{entity.parentUnitName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
