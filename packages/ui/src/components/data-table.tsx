import * as React from 'react';
import { cn } from '../lib/cn';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

/**
 * Tabela genérica usada em todas as listagens administrativas — nenhum
 * módulo deve reimplementar uma tabela ad-hoc (docs/architecture/05-
 * componentes.md §5.7). Recebe os dados já paginados/filtrados pelo
 * servidor; não faz sorting/paginação client-side.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  emptyState,
  onRowClick,
}: DataTableProps<T>) {
  if (rows.length === 0 && emptyState) {
    return <div className="border-border bg-surface rounded-lg border p-10">{emptyState}</div>;
  }

  return (
    <div className="border-border bg-surface overflow-x-auto rounded-lg border shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-muted px-4 py-3 text-left font-mono text-xs font-medium uppercase tracking-wide"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowId(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-border border-b last:border-0',
                onRowClick && 'hover:bg-background/60 cursor-pointer',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3', col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
