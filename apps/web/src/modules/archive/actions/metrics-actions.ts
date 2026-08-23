'use server';

import { ARCHIVE_ITEM_TYPE_LABELS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const MOST_VIEWED_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 12;

export interface MostViewedArchiveItemView {
  id: string;
  titulo: string;
  tipoLabel: string;
  contagemVisualizacoes: number;
}

/**
 * Os itens do Acervo VL6 com mais visualizações — seção "Mais visualizados"
 * do Painel administrativo (Fase C "Administração & métricas"). Reaproveita
 * `ListMostViewedArchiveItemsUseCase`, só traduzindo `tipo` pro rótulo em
 * português.
 */
export async function loadMostViewedArchiveItemsAction(): Promise<MostViewedArchiveItemView[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const items = await container.useCases.listMostViewedArchiveItems.execute(
    session.authContext,
    MOST_VIEWED_LIMIT,
  );

  return items.map((item) => ({
    id: item.id,
    titulo: item.titulo,
    tipoLabel: ARCHIVE_ITEM_TYPE_LABELS[item.tipo],
    contagemVisualizacoes: item.contagemVisualizacoes ?? 0,
  }));
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: 'criou',
  update: 'atualizou',
  delete: 'excluiu',
  restore: 'restaurou',
  login: 'entrou',
  permission_change: 'alterou permissão de',
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  archiveItems: 'um item do Acervo',
  archiveMedia: 'uma mídia do Acervo',
};

export interface RecentArchiveActivityView {
  id: string;
  descricao: string;
  usuarioNome: string;
  timestamp: string;
}

/**
 * Atividade recente do Acervo VL6 — reaproveita a trilha de auditoria já
 * existente (`ListAuditLogUseCase`), filtrada para os recursos
 * `archiveItems`/`archiveMedia`. Duas consultas (uma por entidade, já que
 * `ListAuditLogUseCase` só filtra uma de cada vez) mescladas em memória e
 * ordenadas por `timestamp` desc — mesmo teto pragmático das outras
 * varreduras do Acervo (`ListDuplicateMediaAssetsUseCase`), o volume de
 * auditoria de uma Loja é pequeno.
 */
export async function loadRecentArchiveActivityAction(): Promise<RecentArchiveActivityView[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const [itemLogs, mediaLogs] = await Promise.all([
    container.useCases.listAuditLog.execute(
      session.authContext,
      { entidade: 'archiveItems' },
      { limit: RECENT_ACTIVITY_LIMIT },
    ),
    container.useCases.listAuditLog.execute(
      session.authContext,
      { entidade: 'archiveMedia' },
      { limit: RECENT_ACTIVITY_LIMIT },
    ),
  ]);

  const entries = [...itemLogs.items, ...mediaLogs.items]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, RECENT_ACTIVITY_LIMIT);

  const userIds = [...new Set(entries.map((entry) => entry.usuarioId))];
  const members = await Promise.all(
    userIds.map((userId) =>
      container.repositories.member.findByUserId(session.authContext.tenantId, userId),
    ),
  );
  const nomeByUserId = new Map(
    userIds.map((userId, index) => [userId, members[index]?.nomeCompleto ?? null]),
  );

  return entries.map((entry) => ({
    id: entry.id,
    descricao: `${AUDIT_ACTION_LABELS[entry.acao] ?? entry.acao} ${AUDIT_ENTITY_LABELS[entry.entidade] ?? entry.entidade}`,
    usuarioNome: nomeByUserId.get(entry.usuarioId) ?? 'Administrador',
    timestamp: entry.timestamp.toISOString(),
  }));
}

export interface StorageUsageByBoardTermView {
  boardTermId: string;
  boardTermNome: string;
  totalBytes: number;
  quantidadeArquivos: number;
}

/**
 * Uso de armazenamento por Gestão — Fase C "Administração & métricas".
 * Reaproveita `GetStorageUsageByBoardTermUseCase` sem transformação (já
 * retorna o formato pronto pra tela).
 */
export async function loadStorageUsageByBoardTermAction(): Promise<StorageUsageByBoardTermView[]> {
  const session = await requireSession();
  const container = createServerContainer();

  return container.useCases.getStorageUsageByBoardTerm.execute(session.authContext);
}
