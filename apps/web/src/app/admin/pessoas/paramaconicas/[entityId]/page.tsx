import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { hasPermission, type ParamasonicEntityMemberDTO } from '@vl6/domain';
import {
  FRATERNAL_AFFILIATION_LABELS,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_LABELS,
  PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS,
  PARAMASONIC_ENTITY_STATUS_LABELS,
  type ParamasonicEntityMemberCategoryGroup,
} from '@vl6/shared';
import { ArrowLeft, Badge, EmptyState, Users } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AddParamasonicEntityMemberDialog } from '@/modules/family-legacy/components/add-paramasonic-entity-member-dialog';
import { AddParamasonicEntityPositionDialog } from '@/modules/family-legacy/components/add-paramasonic-entity-position-dialog';
import { EditParamasonicEntityMemberDialog } from '@/modules/family-legacy/components/edit-paramasonic-entity-member-dialog';
import { RemoveParamasonicEntityMemberButton } from '@/modules/family-legacy/components/remove-paramasonic-entity-member-button';
import { RemoveParamasonicEntityPositionButton } from '@/modules/family-legacy/components/remove-paramasonic-entity-position-button';
import { SyncSpousesToParamasonicEntityRunner } from '@/modules/family-legacy/components/sync-spouses-to-paramasonic-entity-runner';

const CATEGORY_GROUP_ORDER: ParamasonicEntityMemberCategoryGroup[] = [
  'membros_juvenis',
  'membros_adultos',
  'outros_vinculos_apoio',
];

function groupMembersByCategory(
  members: ParamasonicEntityMemberDTO[],
): Array<{ label: string; members: ParamasonicEntityMemberDTO[] }> {
  const groups = new Map<string, ParamasonicEntityMemberDTO[]>();
  for (const member of members) {
    const key = member.categoria
      ? PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY[member.categoria]
      : 'sem_categoria';
    const bucket = groups.get(key) ?? [];
    bucket.push(member);
    groups.set(key, bucket);
  }

  const ordered: Array<{ label: string; members: ParamasonicEntityMemberDTO[] }> = [];
  for (const group of CATEGORY_GROUP_ORDER) {
    const bucket = groups.get(group);
    if (bucket)
      ordered.push({
        label: PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS[group],
        members: bucket,
      });
  }
  const semCategoria = groups.get('sem_categoria');
  if (semCategoria) ordered.push({ label: 'Sem categoria definida', members: semCategoria });
  return ordered;
}

const STATUS_BADGE_VARIANT = {
  ativa: 'success',
  em_implantacao: 'warning',
  inativa: 'outline',
} as const;

export default async function ParamasonicEntityDetailPage({
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

  const canLinkMembers =
    entity.kind !== 'female_fraternity' && hasPermission(session.authContext, 'member:read');
  const canEditFamilyLegacy = hasPermission(session.authContext, 'familyLegacy:manage');

  const [members, positions, memberOptionsPage] = await Promise.all([
    container.useCases.listParamasonicEntityMembers.execute(session.authContext, entityId),
    container.useCases.listParamasonicEntityPositions.execute(session.authContext, entityId),
    canLinkMembers
      ? container.useCases.searchMembers.execute(session.authContext, {}, { limit: 100 })
      : Promise.resolve(null),
  ]);
  const memberOptions = (memberOptionsPage?.items ?? [])
    .map((m) => ({ id: m.id, nomeCompleto: m.nomeCompleto }))
    .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6">
      <Link
        href="/admin/pessoas/paramaconicas"
        className="border-border bg-surface hover:border-primary hover:text-primary flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Entidades paramaçônicas
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-accent text-xs font-semibold uppercase tracking-wide">
            {FRATERNAL_AFFILIATION_LABELS[entity.kind]}
          </span>
          <h1 className="font-display text-2xl font-semibold">{entity.shortName}</h1>
          <p className="text-muted mt-1 text-sm">{entity.name}</p>
          <p className="text-muted mt-1 text-xs">{entity.parentUnitName}</p>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[entity.situacao]}>
          {PARAMASONIC_ENTITY_STATUS_LABELS[entity.situacao]}
        </Badge>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Cargos</h2>
            <p className="text-muted text-xs">
              Cadastre uma vez e reaproveite ao adicionar integrantes.
            </p>
          </div>
          <AddParamasonicEntityPositionDialog entityId={entity.id} />
        </div>

        {positions.length === 0 ? (
          <p className="text-muted text-sm">Nenhum cargo cadastrado ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {positions.map((position) => (
              <span
                key={position.id}
                className="border-border bg-surface flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
              >
                {position.nome}
                <RemoveParamasonicEntityPositionButton
                  entityId={entity.id}
                  positionId={position.id}
                />
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">Integrantes</h2>
          <div className="flex items-center gap-2">
            {entity.kind === 'female_fraternity' && (
              <SyncSpousesToParamasonicEntityRunner entityId={entity.id} />
            )}
            <AddParamasonicEntityMemberDialog
              entityId={entity.id}
              allowLinkingMember={canLinkMembers}
              memberOptions={memberOptions}
              positionOptions={positions.map((p) => ({ id: p.id, nome: p.nome }))}
            />
          </div>
        </div>

        {members.length === 0 ? (
          <EmptyState
            icon={<Users size={22} strokeWidth={1.75} />}
            title="Nenhum integrante cadastrado ainda"
            description="Adicione o corpo próprio da entidade ou vincule um Irmão que já ocupou cargo nela."
          />
        ) : (
          groupMembersByCategory(members).map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <h3 className="text-muted text-xs font-semibold uppercase tracking-wide">
                {group.label} ({group.members.length})
              </h3>
              <div className="border-border overflow-hidden rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Nome</th>
                      <th className="px-4 py-2 text-left font-medium">Categoria</th>
                      <th className="px-4 py-2 text-left font-medium">Cargo</th>
                      <th className="px-4 py-2 text-left font-medium">Situação</th>
                      <th className="px-4 py-2 text-left font-medium">Origem</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.members.map((member) => (
                      <tr key={member.id} className="border-border border-t">
                        <td className="px-4 py-2">{member.nomeCompleto}</td>
                        <td className="text-muted px-4 py-2">
                          {member.categoria
                            ? PARAMASONIC_ENTITY_MEMBER_CATEGORY_LABELS[member.categoria]
                            : '—'}
                        </td>
                        <td className="text-muted px-4 py-2">{member.cargo ?? '—'}</td>
                        <td className="px-4 py-2">
                          <Badge variant={member.situacao === 'ativo' ? 'success' : 'outline'}>
                            {PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS[member.situacao]}
                          </Badge>
                        </td>
                        <td className="text-muted px-4 py-2">
                          {member.memberId ? 'Irmão vinculado' : 'Corpo próprio'}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <EditParamasonicEntityMemberDialog
                              entityId={entity.id}
                              member={member}
                              positionOptions={positions.map((p) => ({ id: p.id, nome: p.nome }))}
                              allowFamilyLegacyActions={canEditFamilyLegacy}
                            />
                            <RemoveParamasonicEntityMemberButton
                              entityId={entity.id}
                              memberEntryId={member.id}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
