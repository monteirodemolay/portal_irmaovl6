'use client';

import { useState } from 'react';
import Link from 'next/link';
import type {
  AreaFacet,
  BusinessDirectoryFilterOptions,
  DirectoryFilterOptions,
} from '@vl6/domain';
import { AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import { ChevronRight, Input, Search, Select, SlidersHorizontal, X } from '@vl6/ui';

export type CommunityTipo = 'tudo' | 'irmaos' | 'negocios';

export interface CommunityFiltersValues {
  q?: string;
  cidade?: string;
  areaAtuacao?: AreaAtuacaoKey;
  profissao?: string;
  tag?: string;
  empresa?: string;
  segmento?: string;
  online?: boolean;
  desconto?: boolean;
}

const TIPO_LABELS: Record<CommunityTipo, string> = {
  tudo: 'Tudo',
  irmaos: 'Irmãos',
  negocios: 'Negócios e Serviços',
};

function buildHref(tipo: CommunityTipo, preserved: Partial<CommunityFiltersValues>): string {
  const params = new URLSearchParams();
  params.set('tipo', tipo);
  if (preserved.q) params.set('q', preserved.q);
  if (preserved.cidade) params.set('cidade', preserved.cidade);
  const qs = params.toString();
  return qs ? `/irmaos?${qs}` : '/irmaos';
}

function removeParamHref(current: URLSearchParams, key: string): string {
  const params = new URLSearchParams(current);
  params.delete(key);
  const qs = params.toString();
  return qs ? `/irmaos?${qs}` : '/irmaos';
}

/**
 * Busca unificada da Comunidade VL6 — um único campo de texto + controle
 * segmentado Tudo/Irmãos/Negócios, com filtros progressivos que trocam de
 * conjunto conforme `tipo` (documento de referência, "Filtros progressivos").
 * Reaproveita só os campos que os casos de uso de busca já suportam de
 * verdade (`SearchDirectoryUseCase`/`SearchBusinessDirectoryUseCase`) — sem
 * inventar filtro de grau, cargo ou comissão, que a busca não tem hoje.
 */
export function CommunitySearchPanel({
  tipo,
  filters,
  directoryOptions,
  businessOptions,
  areaFacets,
  resultCount,
}: {
  tipo: CommunityTipo;
  filters: CommunityFiltersValues;
  directoryOptions: DirectoryFilterOptions;
  businessOptions: BusinessDirectoryFilterOptions;
  areaFacets: AreaFacet[];
  resultCount: number;
}) {
  const hasAnyAdvancedOption =
    directoryOptions.profissoes.length > 0 ||
    directoryOptions.tags.length > 0 ||
    directoryOptions.empresas.length > 0;

  const activeAdvancedCount = [
    filters.areaAtuacao,
    filters.profissao,
    filters.tag,
    filters.empresa,
    filters.segmento,
    filters.online,
    filters.desconto,
  ].filter(Boolean).length;

  const [advancedOpen, setAdvancedOpen] = useState(activeAdvancedCount > 0);

  const currentParams = new URLSearchParams();
  currentParams.set('tipo', tipo);
  if (filters.q) currentParams.set('q', filters.q);
  if (filters.cidade) currentParams.set('cidade', filters.cidade);
  if (filters.areaAtuacao) currentParams.set('areaAtuacao', filters.areaAtuacao);
  if (filters.profissao) currentParams.set('profissao', filters.profissao);
  if (filters.tag) currentParams.set('tag', filters.tag);
  if (filters.empresa) currentParams.set('empresa', filters.empresa);
  if (filters.segmento) currentParams.set('segmento', filters.segmento);
  if (filters.online) currentParams.set('online', '1');
  if (filters.desconto) currentParams.set('desconto', '1');

  const cidadeOptions =
    tipo === 'negocios'
      ? businessOptions.cidades
      : tipo === 'irmaos'
        ? directoryOptions.cidades
        : [...directoryOptions.cidades, ...businessOptions.cidades];

  const chips: { key: string; label: string }[] = [];
  if (filters.cidade) chips.push({ key: 'cidade', label: `Cidade: ${filters.cidade}` });
  if (filters.areaAtuacao)
    chips.push({ key: 'areaAtuacao', label: `Área: ${AREA_ATUACAO_LABELS[filters.areaAtuacao]}` });
  if (filters.profissao) chips.push({ key: 'profissao', label: `Profissão: ${filters.profissao}` });
  if (filters.tag) chips.push({ key: 'tag', label: `Competência/serviço: ${filters.tag}` });
  if (filters.empresa) chips.push({ key: 'empresa', label: `Empresa: ${filters.empresa}` });
  if (filters.segmento) chips.push({ key: 'segmento', label: `Segmento: ${filters.segmento}` });
  if (filters.online) chips.push({ key: 'online', label: 'Atende online/remoto' });
  if (filters.desconto) chips.push({ key: 'desconto', label: 'Condição especial p/ Irmãos' });

  return (
    <div className="flex flex-col gap-3">
      <nav
        aria-label="Tipo de resultado"
        className="border-border bg-surface inline-flex w-fit rounded-full border p-1 text-sm"
      >
        {(['tudo', 'irmaos', 'negocios'] as CommunityTipo[]).map((option) => {
          const active = option === tipo;
          return (
            <Link
              key={option}
              href={buildHref(option, filters)}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'bg-primary rounded-full px-3.5 py-1.5 font-semibold text-white transition-colors'
                  : 'text-muted hover:text-foreground rounded-full px-3.5 py-1.5 font-medium transition-colors'
              }
            >
              {TIPO_LABELS[option]}
            </Link>
          );
        })}
      </nav>

      <form method="get" action="/irmaos" className="flex flex-col gap-3">
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search
              size={16}
              className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            />
            <Input
              type="search"
              name="q"
              placeholder="Busque um Irmão, profissão, competência, empresa, produto ou serviço..."
              defaultValue={filters.q ?? ''}
              className="pl-9"
            />
          </div>
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen((v) => !v)}
            className={
              advancedOpen
                ? 'border-primary bg-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors'
                : 'border-border bg-surface hover:border-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors'
            }
          >
            <SlidersHorizontal size={15} />
            Mais filtros
            {activeAdvancedCount > 0 && (
              <span
                className={
                  advancedOpen
                    ? 'rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] font-bold leading-none'
                    : 'bg-primary rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none text-white'
                }
              >
                {activeAdvancedCount}
              </span>
            )}
            <ChevronRight
              size={14}
              className={advancedOpen ? 'rotate-90 transition-transform' : 'transition-transform'}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tipo !== 'negocios' && areaFacets.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm">
              Área de atuação
              <Select name="areaAtuacao" defaultValue={filters.areaAtuacao ?? ''}>
                <option value="">Todas</option>
                {areaFacets.map((area) => (
                  <option key={area.key} value={area.key}>
                    {AREA_ATUACAO_LABELS[area.key]} ({area.count})
                  </option>
                ))}
              </Select>
            </label>
          )}
          {tipo !== 'irmaos' && businessOptions.segmentos.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm">
              Segmento
              <Select name="segmento" defaultValue={filters.segmento ?? ''}>
                <option value="">Todos</option>
                {businessOptions.segmentos.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value} ({opt.count})
                  </option>
                ))}
              </Select>
            </label>
          )}
          {cidadeOptions.length > 0 && (
            <label className="flex flex-col gap-1.5 text-sm">
              Cidade
              <Select name="cidade" defaultValue={filters.cidade ?? ''}>
                <option value="">Todas</option>
                {cidadeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value} ({opt.count})
                  </option>
                ))}
              </Select>
            </label>
          )}
        </div>

        <div
          hidden={!advancedOpen}
          className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4"
        >
          {tipo !== 'negocios' && hasAnyAdvancedOption && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {directoryOptions.profissoes.length > 0 && (
                <label className="flex flex-col gap-1.5 text-sm">
                  Profissão
                  <Select name="profissao" defaultValue={filters.profissao ?? ''}>
                    <option value="">Todas</option>
                    {directoryOptions.profissoes.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              {directoryOptions.tags.length > 0 && (
                <label className="flex flex-col gap-1.5 text-sm">
                  Competência ou serviço
                  <Select name="tag" defaultValue={filters.tag ?? ''}>
                    <option value="">Todas</option>
                    {directoryOptions.tags.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              {directoryOptions.empresas.length > 0 && (
                <label className="flex flex-col gap-1.5 text-sm">
                  Empresa
                  <Select name="empresa" defaultValue={filters.empresa ?? ''}>
                    <option value="">Todas</option>
                    {directoryOptions.empresas.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.value} ({opt.count})
                      </option>
                    ))}
                  </Select>
                </label>
              )}
            </div>
          )}

          {tipo !== 'irmaos' && (
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="online"
                  value="1"
                  defaultChecked={Boolean(filters.online)}
                  className="accent-primary"
                />
                Atende online/remoto
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="desconto"
                  value="1"
                  defaultChecked={Boolean(filters.desconto)}
                  className="accent-primary"
                />
                Condição especial para Irmãos
              </label>
            </div>
          )}

          <button
            type="submit"
            className="bg-primary w-fit rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Aplicar filtros
          </button>
        </div>
      </form>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <Link
              key={chip.key}
              href={removeParamHref(currentParams, chip.key)}
              className="border-border bg-surface hover:border-primary flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors"
            >
              {chip.label}
              <X size={12} />
            </Link>
          ))}
          <Link
            href={buildHref(tipo, { q: filters.q })}
            className="text-accent text-xs font-medium hover:underline"
          >
            Limpar filtros
          </Link>
        </div>
      )}

      <p className="text-muted text-sm">
        {resultCount} {resultCount === 1 ? 'resultado encontrado' : 'resultados encontrados'}
      </p>
    </div>
  );
}
