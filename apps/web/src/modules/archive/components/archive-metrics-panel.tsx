import { Badge, Card, CardContent, CardHeader, CardTitle, DataTable, EmptyState } from '@vl6/ui';
import type {
  MostViewedArchiveItemView,
  RecentArchiveActivityView,
  StorageUsageByBoardTermView,
} from '../actions/metrics-actions';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

export interface ArchiveMetricsPanelProps {
  mostViewed: MostViewedArchiveItemView[];
  recentActivity: RecentArchiveActivityView[];
  storageUsage: StorageUsageByBoardTermView[];
}

/**
 * Painel de métricas do Acervo VL6 — Fase C "Administração & métricas". Só
 * exibição (nenhuma ação de escrita aqui), então fica como componente de
 * servidor puro, sem `'use client'`.
 */
export function ArchiveMetricsPanel({
  mostViewed,
  recentActivity,
  storageUsage,
}: ArchiveMetricsPanelProps) {
  const maxBytes = Math.max(1, ...storageUsage.map((row) => row.totalBytes));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Mais visualizados</CardTitle>
        </CardHeader>
        <CardContent>
          {mostViewed.length === 0 ? (
            <EmptyState
              title="Nenhuma visualização registrada"
              description="Assim que itens publicados do Acervo forem visualizados, o ranking aparece aqui."
            />
          ) : (
            <ol className="flex flex-col gap-3">
              {mostViewed.map((item, index) => (
                <li key={item.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-muted font-mono text-xs">{index + 1}</span>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{item.titulo}</span>
                      <Badge variant="accent" className="mt-1 w-fit">
                        {item.tipoLabel}
                      </Badge>
                    </span>
                  </span>
                  <span className="font-display shrink-0 text-lg font-semibold">
                    {item.contagemVisualizacoes}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <EmptyState
              title="Nenhuma atividade registrada"
              description="Criações, edições e publicações no Acervo aparecem aqui assim que acontecerem."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {recentActivity.map((entry) => (
                <li key={entry.id} className="flex flex-col gap-0.5 text-sm">
                  <span>
                    <strong className="font-medium">{entry.usuarioNome}</strong> {entry.descricao}
                  </span>
                  <span className="text-muted text-xs">{formatDateTime(entry.timestamp)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Uso de armazenamento por Gestão</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={[
              { key: 'gestao', header: 'Gestão', cell: (row) => row.boardTermNome },
              {
                key: 'barra',
                header: 'Uso',
                cell: (row) => (
                  <div className="bg-background h-2 w-full max-w-40 overflow-hidden rounded-full">
                    <div
                      className="bg-accent h-full rounded-full"
                      style={{ width: `${Math.max(2, (row.totalBytes / maxBytes) * 100)}%` }}
                    />
                  </div>
                ),
              },
              {
                key: 'tamanho',
                header: 'Tamanho',
                cell: (row) => formatBytes(row.totalBytes),
              },
              {
                key: 'quantidade',
                header: 'Arquivos',
                cell: (row) => String(row.quantidadeArquivos),
              },
            ]}
            rows={storageUsage}
            getRowId={(row) => row.boardTermId}
            emptyState={
              <EmptyState
                title="Nenhuma Gestão cadastrada"
                description="Cadastre uma Gestão em Pessoas & Loja → Gestões para acompanhar o uso de armazenamento."
              />
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
