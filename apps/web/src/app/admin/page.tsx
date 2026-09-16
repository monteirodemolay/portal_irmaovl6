import Link from 'next/link';
import { hasPermission } from '@vl6/domain';
import {
  MEMBER_SITUATION_STATUSES,
  MEMBER_SITUATION_STATUS_LABELS,
  type MemberSituationStatus,
  type PermissionKey,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  CalendarDays,
  FileText,
  Images,
  Library,
  Megaphone,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from '@/lib/audit/audit-action-label';
import { resolveActorLabel } from '@/lib/audit/resolve-actor-label';
import { formatRelativeDate, percentOf } from '@/modules/admin/lib/dashboard-metrics';

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

function KpiCard({
  href,
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  href: string;
  icon: IconType;
  label: string;
  value: number;
  detail?: string;
  tone?: 'warning';
}) {
  return (
    <Link
      href={href}
      className="border-border bg-surface hover:border-primary rounded-2xl border p-5 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted text-sm">{label}</p>
        <Icon size={18} strokeWidth={1.75} className="text-muted shrink-0" />
      </div>
      <p className="font-display mt-1 text-3xl font-semibold">{value}</p>
      {detail && (
        <p className={`mt-1 text-xs ${tone === 'warning' ? 'text-amber-600' : 'text-muted'}`}>
          {detail}
        </p>
      )}
    </Link>
  );
}

function FunnelRow({
  href,
  label,
  value,
  total,
}: {
  href: string;
  label: string;
  value: number;
  total: number;
}) {
  const pct = percentOf(value, total);
  return (
    <Link
      href={href}
      className="hover:bg-accent/10 -mx-2 flex items-center gap-3 rounded-lg px-2 py-2 transition-colors"
    >
      <span className="w-44 shrink-0 text-sm">{label}</span>
      <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
        <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-muted w-10 shrink-0 text-right text-xs">{pct}%</span>
      <span className="w-12 shrink-0 text-right text-sm font-semibold tabular-nums">{value}</span>
    </Link>
  );
}

/**
 * Painel de gestão da Loja — reconstrução do dashboard administrativo a
 * partir do mock-up fornecido pelo Administrador, mas com uma regra que
 * nunca é negociável neste Portal: todo número vem de uma consulta real
 * (agregada com `count()` sempre que possível), nunca inventado/
 * demonstrativo. Isso deixou algumas peças do mock-up de fora — "Acessos ao
 * Portal", "Usuários recorrentes" e "Engajamento" exigiriam telemetria de
 * sessão/página que este Portal ainda não coleta — substituídas por peças
 * com o mesmo espírito visual, mas 100% reais: distribuição por situação
 * Maçônica, cobertura de cadastro (funil) e atividade recente (trilha de
 * auditoria já existente).
 *
 * Cada seção só aparece se a sessão tem a permissão granular
 * correspondente, e só então a consulta roda (mesmo princípio do
 * `buildTileDefs` anterior). Todo cartão/linha é um link pra tela real.
 */
export default async function AdminDashboardPage() {
  const [session, current] = await Promise.all([requireSession(), getCurrentTenant()]);
  const ctx = session.authContext;
  const tenantId = ctx.tenantId;
  const container = createServerContainer();
  const can = (permission: PermissionKey) => hasPermission(ctx, permission);

  const canMemberRead = can('member:read');
  const canMemberManage = can('member:manage');
  const canUserRead = can('user:read');
  const canCentralManage = can('memberCentral:manage');
  const canContributionManage = can('archiveContribution:manage');
  const canAuditRead = can('auditLog:read');

  const [
    totalMembers,
    activeMembers,
    linkedAccounts,
    publishedProfiles,
    unclaimedMembers,
    duplicateResult,
    pendingContributions,
    situacaoCounts,
    auditPage,
    announcementsCount,
    upcomingEventsCount,
    filesCount,
    libraryCount,
    galleryCount,
    archiveItemsCount,
  ] = await Promise.all([
    canMemberRead ? container.repositories.member.countByTenant(tenantId) : Promise.resolve(null),
    canMemberRead
      ? container.repositories.member.countBySituacao(tenantId, 'ativo')
      : Promise.resolve(null),
    canUserRead ? container.repositories.user.countByTenant(tenantId) : Promise.resolve(null),
    canCentralManage
      ? container.repositories.publicationSettings.countPublishedByTenant(tenantId)
      : Promise.resolve(null),
    canMemberRead
      ? container.repositories.member.findUnclaimedByTenant(tenantId)
      : Promise.resolve([]),
    canMemberManage ? container.useCases.listDuplicateMembers.execute(ctx) : Promise.resolve(null),
    canContributionManage
      ? container.repositories.archiveContribution.countPendingByTenant(tenantId)
      : Promise.resolve(null),
    canMemberRead
      ? Promise.all(
          MEMBER_SITUATION_STATUSES.map((situacao) =>
            container.repositories.member.countBySituacao(tenantId, situacao),
          ),
        )
      : Promise.resolve(null),
    canAuditRead
      ? container.useCases.listAuditLog.execute(ctx, {}, { limit: 8 })
      : Promise.resolve(null),
    can('announcement:read')
      ? container.repositories.announcement.countPublishedByTenant(tenantId)
      : Promise.resolve(null),
    can('event:read')
      ? container.repositories.event.countUpcomingByTenant(tenantId, new Date())
      : Promise.resolve(null),
    can('file:read')
      ? container.repositories.fileAsset.countByTenant(tenantId)
      : Promise.resolve(null),
    can('libraryItem:read')
      ? container.repositories.libraryItem.countByTenant(tenantId)
      : Promise.resolve(null),
    can('gallery:read')
      ? container.repositories.galleryAlbum.countByTenant(tenantId)
      : Promise.resolve(null),
    can('archiveItem:read')
      ? container.repositories.archiveItem.countByTenant(tenantId)
      : Promise.resolve(null),
  ]);

  const duplicateGroups = duplicateResult?.ok ? duplicateResult.value : [];
  const recentAudit = auditPage
    ? await Promise.all(
        auditPage.items.map(async (entry) => ({
          entry,
          actorLabel: await resolveActorLabel(container, entry.usuarioId),
        })),
      )
    : null;

  const pendingCount = duplicateGroups.length + (pendingContributions ?? 0);
  const showPendingKpi = canMemberManage || canContributionManage;

  const actionItems = [
    canMemberManage && duplicateGroups.length > 0
      ? {
          label: `Revisar ${duplicateGroups.length} grupo${duplicateGroups.length > 1 ? 's' : ''} de Irmãos duplicados`,
          detail: 'Cadastros com o mesmo nome ou nomes muito parecidos.',
          href: '/admin/pessoas/irmaos/duplicados',
        }
      : null,
    canContributionManage && (pendingContributions ?? 0) > 0
      ? {
          label: `Revisar ${pendingContributions} contribuição${pendingContributions === 1 ? '' : 'ões'} do Acervo`,
          detail: 'Enviadas por Irmãos, aguardando moderação.',
          href: '/admin/acervo/contribuicoes',
        }
      : null,
    canMemberRead && unclaimedMembers.length > 0
      ? {
          label: `${unclaimedMembers.length} Irmão${unclaimedMembers.length === 1 ? '' : 's'} ainda sem acesso ao Portal`,
          detail: 'Podem criar o próprio acesso em "Reivindique seu cadastro", na tela de login.',
          href: '/admin/pessoas/irmaos?situacao=ativo',
        }
      : null,
  ].filter((item): item is { label: string; detail: string; href: string } => item !== null);

  const moduleTiles: { label: string; value: number; href: string; icon: IconType }[] = [];
  if (announcementsCount !== null) {
    moduleTiles.push({
      label: 'Avisos publicados',
      value: announcementsCount,
      href: '/admin/conteudo/avisos',
      icon: Megaphone,
    });
  }
  if (upcomingEventsCount !== null) {
    moduleTiles.push({
      label: 'Próximos eventos',
      value: upcomingEventsCount,
      href: '/admin/conteudo/agenda',
      icon: CalendarDays,
    });
  }
  if (filesCount !== null) {
    moduleTiles.push({
      label: 'Documentos no Acervo',
      value: filesCount,
      href: '/admin/acervo/arquivos',
      icon: FileText,
    });
  }
  if (libraryCount !== null) {
    moduleTiles.push({
      label: 'Itens na Biblioteca',
      value: libraryCount,
      href: '/admin/acervo/biblioteca',
      icon: Library,
    });
  }
  if (galleryCount !== null) {
    moduleTiles.push({
      label: 'Álbuns de fotos',
      value: galleryCount,
      href: '/admin/acervo/galeria',
      icon: Images,
    });
  }
  if (archiveItemsCount !== null) {
    moduleTiles.push({
      label: 'Itens no Acervo VL6',
      value: archiveItemsCount,
      href: '/admin/acervo/publicar',
      icon: Archive,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Painel de gestão da Loja</h1>
        <p className="text-muted">
          {current?.tenant.nome} — visão consolidada de pessoas, conteúdo e segurança do Portal.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {activeMembers !== null && (
          <KpiCard
            href="/admin/pessoas/irmaos?situacao=ativo"
            icon={UserCheck}
            label="Irmãos ativos"
            value={activeMembers}
            detail={totalMembers !== null ? `${totalMembers} cadastrados no total` : undefined}
          />
        )}
        {linkedAccounts !== null && (
          <KpiCard
            href="/admin/pessoas/usuarios"
            icon={ShieldCheck}
            label="Contas vinculadas"
            value={linkedAccounts}
            detail={
              totalMembers
                ? `${percentOf(linkedAccounts, totalMembers)}% dos Irmãos cadastrados`
                : undefined
            }
          />
        )}
        {publishedProfiles !== null && (
          <KpiCard
            href="/admin/pessoas/central"
            icon={Users}
            label="Perfis publicados na Central"
            value={publishedProfiles}
            detail={
              totalMembers
                ? `${percentOf(publishedProfiles, totalMembers)}% dos Irmãos cadastrados`
                : undefined
            }
          />
        )}
        {announcementsCount !== null && (
          <KpiCard
            href="/admin/conteudo/avisos"
            icon={Megaphone}
            label="Avisos publicados"
            value={announcementsCount}
          />
        )}
        {showPendingKpi && (
          <KpiCard
            href="#plano-de-acao"
            icon={AlertTriangle}
            label="Pendências"
            value={pendingCount}
            detail={
              pendingCount > 0 ? 'Veja o Plano de ação abaixo' : 'Nenhuma pendência no momento'
            }
            tone={pendingCount > 0 ? 'warning' : undefined}
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {totalMembers !== null && (canUserRead || canCentralManage) && (
          <div className="border-border bg-surface rounded-2xl border p-5">
            <h2 className="font-display text-lg font-semibold">Cobertura de cadastro</h2>
            <p className="text-muted mb-3 text-sm">Da base institucional ao uso do Portal.</p>
            <div className="flex flex-col">
              <FunnelRow
                href="/admin/pessoas/irmaos"
                label="Irmãos cadastrados"
                value={totalMembers}
                total={totalMembers}
              />
              {linkedAccounts !== null && (
                <FunnelRow
                  href="/admin/pessoas/usuarios"
                  label="Contas vinculadas"
                  value={linkedAccounts}
                  total={totalMembers}
                />
              )}
              {publishedProfiles !== null && (
                <FunnelRow
                  href="/admin/pessoas/central"
                  label="Perfis publicados"
                  value={publishedProfiles}
                  total={totalMembers}
                />
              )}
            </div>
          </div>
        )}

        {situacaoCounts && totalMembers !== null && (
          <div className="border-border bg-surface rounded-2xl border p-5">
            <h2 className="font-display text-lg font-semibold">Distribuição por situação</h2>
            <p className="text-muted mb-3 text-sm">Situação Maçônica atual de cada Irmão.</p>
            <div className="flex flex-col">
              {MEMBER_SITUATION_STATUSES.map((situacao: MemberSituationStatus, index) => (
                <FunnelRow
                  key={situacao}
                  href={`/admin/pessoas/irmaos?situacao=${situacao}`}
                  label={MEMBER_SITUATION_STATUS_LABELS[situacao]}
                  value={situacaoCounts[index] ?? 0}
                  total={totalMembers}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {moduleTiles.length > 0 && (
        <div className="border-border bg-surface rounded-2xl border p-5">
          <h2 className="font-display text-lg font-semibold">Módulos e conteúdo</h2>
          <p className="text-muted mb-3 text-sm">Volume publicado em cada área do Portal.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {moduleTiles.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                className="border-border hover:border-primary hover:bg-accent/10 flex items-center gap-3 rounded-xl border p-3 transition-colors"
              >
                <tile.icon size={18} strokeWidth={1.75} className="text-accent shrink-0" />
                <span className="flex-1 text-sm">{tile.label}</span>
                <span className="text-sm font-semibold tabular-nums">{tile.value}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(canMemberManage || canContributionManage || canMemberRead) && (
          <div
            id="plano-de-acao"
            className="border-border bg-surface scroll-mt-6 rounded-2xl border p-5"
          >
            <h2 className="font-display text-lg font-semibold">Plano de ação</h2>
            <p className="text-muted mb-3 text-sm">Pendências que dependem de uma decisão sua.</p>
            {actionItems.length === 0 ? (
              <p className="text-muted text-sm">Tudo em dia — nenhuma pendência no momento.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {actionItems.map((item) => (
                  <li key={item.href + item.label}>
                    <Link
                      href={item.href}
                      className="hover:bg-accent/10 -mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors"
                    >
                      <UserPlus
                        size={16}
                        strokeWidth={1.75}
                        className="text-accent mt-0.5 shrink-0"
                      />
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{item.label}</span>
                        <span className="text-muted block text-xs">{item.detail}</span>
                      </span>
                      <ArrowUpRight
                        size={14}
                        strokeWidth={2}
                        className="text-muted mt-1 shrink-0"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {recentAudit && (
          <div className="border-border bg-surface rounded-2xl border p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">Atividade recente</h2>
              <Link
                href="/admin/configuracoes/auditoria"
                className="text-accent flex items-center gap-1 text-xs font-semibold hover:underline"
              >
                Ver tudo
                <ArrowUpRight size={12} strokeWidth={2} />
              </Link>
            </div>
            <p className="text-muted mb-3 text-sm">
              Últimas alterações registradas — cobre os principais cadastros do Portal.
            </p>
            {recentAudit.length === 0 ? (
              <p className="text-muted text-sm">Nenhum evento registrado ainda.</p>
            ) : (
              <ul className="divide-border flex flex-col divide-y">
                {recentAudit.map(({ entry, actorLabel }) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {AUDIT_ACTION_LABELS[entry.acao]} ·{' '}
                        {AUDIT_ENTITY_LABELS[entry.entidade] ?? entry.entidade}
                      </p>
                      <p className="text-muted truncate text-xs">{actorLabel}</p>
                    </div>
                    <time className="text-muted shrink-0 text-xs">
                      {formatRelativeDate(entry.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
