import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { FRATERNAL_AFFILIATION_LABELS, PARAMASONIC_ENTITY_STATUS_LABELS } from '@vl6/shared';
import { ArrowLeft, Badge } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ParamasonicEntityMembersBrowser } from '@/modules/family-legacy/components/paramasonic-entity-members-browser';

const STATUS_BADGE_VARIANT = {
  ativa: 'success',
  em_implantacao: 'warning',
  inativa: 'outline',
} as const;

/**
 * Perfil público de uma entidade paramaçônica — pedido do Administrador:
 * "inserir em algum lugar do Perfil do Irmão, que ele foi membro da
 * Paramaçônica, e o link para o perfil da Paramaçônica (criar uma tela com
 * os dados da Paramaçônica)". Mesmos dados institucionais e integrantes já
 * mostrados na tela de administração (`/admin/pessoas/paramaconicas/[entityId]`),
 * só que somente leitura — visível a qualquer sessão com `paramasonicEntity:read`
 * (todo Irmão), não só à Administração.
 */
export default async function PublicParamasonicEntityPage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const session = await requirePagePermission('paramasonicEntity:read');
  const { entityId } = await params;

  const container = createServerContainer();
  const entity = await container.useCases.getParamasonicEntity.execute(
    session.authContext,
    entityId,
  );
  if (!entity) notFound();

  const members = await container.useCases.listParamasonicEntityMembers.execute(
    session.authContext,
    entityId,
  );

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <Link
        href="/paramaconicas"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Comunidade Paramaçônica
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {(entity.crestUrl || entity.logoUrl) && (
            <img
              src={entity.crestUrl ?? entity.logoUrl ?? undefined}
              alt=""
              className="h-16 w-16 shrink-0 rounded-lg object-contain"
            />
          )}
          <div>
            <span className="text-accent text-xs font-semibold uppercase tracking-wide">
              {FRATERNAL_AFFILIATION_LABELS[entity.kind]}
            </span>
            <h1 className="font-display text-2xl font-semibold">{entity.shortName}</h1>
            <p className="text-muted mt-1 text-sm">{entity.name}</p>
            <p className="text-muted mt-1 text-xs">{entity.parentUnitName}</p>
          </div>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[entity.situacao]}>
          {PARAMASONIC_ENTITY_STATUS_LABELS[entity.situacao]}
        </Badge>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">Integrantes</h2>
        <ParamasonicEntityMembersBrowser
          members={members.map((m) => ({
            id: m.id,
            nomeCompleto: m.nomeCompleto,
            memberId: m.memberId,
            cargo: m.cargo,
            categoria: m.categoria,
            situacao: m.situacao,
          }))}
        />
      </section>
    </div>
  );
}
