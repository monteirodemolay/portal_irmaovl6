'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, DataTable, EmptyState, Input } from '@vl6/ui';
import type { DataTableColumn } from '@vl6/ui';

export interface CatalogRow {
  id: string;
  titulo: string;
  autor: string;
  categoria: string;
  formato: string;
  exemplaresLabel: string;
  visualizacoes: number;
  usoLabel: string;
}

export function LibraryCatalogBrowser({ rows }: { rows: CatalogRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.titulo.toLowerCase().includes(term) ||
        row.autor.toLowerCase().includes(term) ||
        row.categoria.toLowerCase().includes(term),
    );
  }, [query, rows]);

  const columns: DataTableColumn<CatalogRow>[] = [
    {
      key: 'arquivo',
      header: 'Arquivo',
      cell: (row) => <span className="font-medium">{row.titulo}</span>,
    },
    { key: 'categoria', header: 'Categoria', cell: (row) => row.categoria },
    {
      key: 'formato',
      header: 'Formato',
      cell: (row) => <Badge variant="outline">{row.formato}</Badge>,
    },
    { key: 'exemplares', header: 'Exemplares', cell: (row) => row.exemplaresLabel },
    { key: 'visualizacoes', header: 'Visualizações', cell: (row) => row.visualizacoes },
    { key: 'downloads', header: 'Uso', cell: (row) => row.usoLabel },
    {
      key: 'acoes',
      header: 'Ações',
      cell: (row) => (
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/acervo/biblioteca/${row.id}/editar`}>Editar</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href={`/admin/acervo/biblioteca/${row.id}/historico`}>Histórico</Link>
          </Button>
        </div>
      ),
    },
  ];

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nenhum item na Biblioteca"
        description="Cadastre a primeira obra física ou digital para iniciar o catálogo."
        action={
          <Button asChild size="sm" className="w-full sm:w-auto">
            <Link href="/admin/acervo/biblioteca/novo">Adicionar obra</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar por título, autor ou categoria…"
        aria-label="Buscar no catálogo"
        className="sm:max-w-sm"
      />
      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma obra encontrada para essa busca" />
      ) : (
        <>
          <section className="grid gap-3 md:hidden" aria-label="Obras da Biblioteca">
            {filtered.map((row) => (
              <Card key={row.id}>
                <CardContent className="grid gap-3 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="break-words font-semibold">{row.titulo}</h2>
                      <p className="text-muted text-sm">{row.categoria}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {row.formato}
                    </Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted text-xs">Exemplares</dt>
                      <dd className="font-medium">{row.exemplaresLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-muted text-xs">Uso</dt>
                      <dd className="font-medium">{row.usoLabel}</dd>
                    </div>
                  </dl>
                  <div className="grid grid-cols-2 gap-2">
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={`/admin/acervo/biblioteca/${row.id}/editar`}>Editar obra</Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link href={`/admin/acervo/biblioteca/${row.id}/historico`}>Histórico</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
          <div className="hidden md:block">
            <DataTable columns={columns} rows={filtered} getRowId={(row) => row.id} />
          </div>
        </>
      )}
    </div>
  );
}
