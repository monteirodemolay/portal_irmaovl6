'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { HONOR_TYPE_LABELS } from '@vl6/shared';
import { EmptyState, Search } from '@vl6/ui';
import {
  filterHonors,
  HONOR_PENDING_LABELS,
  honorPendings,
  honorSummary,
  honorYears,
  type HonorRow,
} from '../lib/honor-admin-view';

const field = 'border-border bg-surface mt-1 min-h-11 w-full rounded-lg border px-3 text-sm';

const formatDate = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        dateStyle: 'short',
      }).format(new Date(iso))
    : '—';

export function HonorsAdminList({ rows, canManage }: { rows: HonorRow[]; canManage: boolean }) {
  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [year, setYear] = useState('Todos');
  const [pending, setPending] = useState('Todos');

  const summary = useMemo(() => honorSummary(rows), [rows]);
  const years = useMemo(() => honorYears(rows), [rows]);
  const visible = useMemo(
    () => filterHonors(rows, { query, tipo, year, pending }),
    [rows, query, tipo, year, pending],
  );
  const filtering = query || tipo !== 'Todos' || year !== 'Todos' || pending !== 'Todos';

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Honrarias na Galeria', summary.total],
          ['Homenageados externos', summary.externos],
          ['Com dados a completar', summary.incompletas],
          ['Tipos em uso', summary.byTipo.size],
        ].map(([label, value]) => (
          <div key={label} className="border-border bg-surface rounded-xl border p-4">
            <dt className="text-muted text-xs">{label}</dt>
            <dd className="font-display mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-border bg-surface grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative text-sm sm:col-span-2 lg:col-span-1">
          Pesquisar
          <Search
            size={15}
            aria-hidden="true"
            className="text-muted pointer-events-none absolute bottom-3.5 left-3"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Homenageado, título, instituição"
            className={`${field} pl-9`}
          />
        </label>
        <label className="text-sm">
          Tipo
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={field}>
            <option>Todos</option>
            {[...summary.byTipo.keys()].map((key) => (
              <option key={key} value={key}>
                {HONOR_TYPE_LABELS[key]} ({summary.byTipo.get(key)})
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Ano
          <select value={year} onChange={(e) => setYear(e.target.value)} className={field}>
            <option>Todos</option>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Pendência
          <select value={pending} onChange={(e) => setPending(e.target.value)} className={field}>
            <option>Todos</option>
            {Object.entries(HONOR_PENDING_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-muted text-sm" role="status" aria-live="polite">
        {visible.length} de {rows.length} honraria(s){filtering ? ' com os filtros atuais' : ''}.
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title={rows.length === 0 ? 'Nenhuma honraria cadastrada' : 'Nada encontrado'}
          description={
            rows.length === 0
              ? 'Lance a primeira na ficha do Irmão homenageado, aba Honrarias.'
              : 'Ajuste ou limpe os filtros.'
          }
        />
      ) : (
        <div className="border-border bg-surface overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-border border-b text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Honraria</th>
                <th className="px-4 py-3 font-medium">Homenageado</th>
                <th className="px-4 py-3 font-medium">Concedente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">A completar</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => {
                const pendings = honorPendings(row);
                return (
                  <tr key={row.id} className="border-border border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.nomeOficial}</p>
                      <p className="text-muted text-xs">{HONOR_TYPE_LABELS[row.tipo]}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.homenageado}
                      {!row.memberId && <span className="text-muted block text-xs">Externo</span>}
                    </td>
                    <td className="text-muted px-4 py-3">{row.instituicao}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.data)}</td>
                    <td className="px-4 py-3">
                      {pendings.length === 0 ? (
                        <span className="text-muted text-xs">Completa</span>
                      ) : (
                        <ul className="flex flex-wrap gap-1">
                          {pendings.map((p) => (
                            <li
                              key={p}
                              className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-900"
                            >
                              {HONOR_PENDING_LABELS[p]}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.memberId && canManage ? (
                        <Link
                          href={`/admin/pessoas/irmaos/${row.memberId}`}
                          className="text-accent inline-flex min-h-11 items-center text-xs font-semibold underline"
                        >
                          Editar na ficha
                        </Link>
                      ) : (
                        <span className="text-muted text-xs">
                          {row.memberId ? 'Somente leitura' : 'Sem ficha'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
