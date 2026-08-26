'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import type { AreaFacet, DirectoryFilterOptions } from '@vl6/domain';
import { AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import { ChevronRight, Input, Search, Select, SlidersHorizontal } from '@vl6/ui';

export interface DirectoryFiltersValues {
  q?: string;
  profissao?: string;
  areaAtuacao?: AreaAtuacaoKey;
  /** Competência OU serviço — os dois campos do cadastro mesclados num único filtro (ver `computeDirectoryFilterOptions`). */
  tag?: string;
  empresa?: string;
  cidade?: string;
}

type QuickChipField = keyof DirectoryFiltersValues;

const QUICK_CHIPS: Array<{ label: string; field: QuickChipField }> = [
  { label: 'Todos', field: 'q' },
  { label: 'Profissão', field: 'profissao' },
  { label: 'Competências e serviços', field: 'tag' },
  { label: 'Empresas', field: 'empresa' },
  { label: 'Área de atuação', field: 'areaAtuacao' },
  { label: 'Cidade', field: 'cidade' },
];

/**
 * Campo de seleção que só oferece valores que existem de verdade no
 * Diretório publicado (`options`, vindas de `computeDirectoryFilterOptions`)
 * — nunca texto livre. Antes esses campos eram `<Input>` de texto livre: dava
 * pra digitar "Advogado" e não achar nada porque ninguém no Diretório se
 * descreveu exatamente assim. Sem nenhum valor cadastrado, o campo nem
 * aparece (não faz sentido oferecer um filtro que sempre dá vazio).
 */
function FacetSelect({
  name,
  label,
  value,
  options,
  selectRef,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: { value: string; count: number }[];
  selectRef: (el: HTMLSelectElement | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      {label}
      <Select ref={selectRef} name={name} defaultValue={value ?? ''}>
        <option value="">Todas</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.value} ({opt.count})
          </option>
        ))}
      </Select>
    </label>
  );
}

/**
 * Um chip de campo de destino (`AREA_EXPLORE_GRID` já resolve "Área de
 * atuação" com clique único de verdade, contagem e tudo — este painel cobre
 * o resto). Cada chip abre o painel avançado e foca o seletor correspondente
 * — feedback visual real de clique (cursor no campo), sem depender de
 * comportamento implícito do navegador.
 */
export function DirectorySearchPanel({
  filters,
  options,
  areaFacets,
}: {
  filters: DirectoryFiltersValues;
  options: DirectoryFilterOptions;
  areaFacets: AreaFacet[];
}) {
  const activeChip = (
    Object.entries(filters) as Array<[keyof DirectoryFiltersValues, string | undefined]>
  ).find(([key, value]) => key !== 'q' && value)?.[0];

  const hasAnyFacetOptions =
    options.profissoes.length > 0 ||
    options.tags.length > 0 ||
    options.empresas.length > 0 ||
    options.cidades.length > 0 ||
    areaFacets.length > 0;

  const [advancedOpen, setAdvancedOpen] = useState(Boolean(activeChip));
  const fieldRefs = useRef<Partial<Record<QuickChipField, HTMLElement | null>>>({});
  const activeFilterCount = (
    Object.entries(filters) as Array<[keyof DirectoryFiltersValues, string | undefined]>
  ).filter(([key, value]) => key !== 'q' && value).length;

  function openAndFocus(field: QuickChipField) {
    if (field === 'q') return;
    setAdvancedOpen(true);
    requestAnimationFrame(() => fieldRefs.current[field]?.focus());
  }

  return (
    <form method="get" className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search
            size={16}
            className="text-muted pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <Input
            type="search"
            name="q"
            placeholder="Buscar Irmão, profissão, empresa, competência ou serviço…"
            defaultValue={filters.q ?? ''}
            className="pl-9"
          />
        </div>
        <button
          type="button"
          aria-expanded={advancedOpen}
          disabled={!hasAnyFacetOptions}
          onClick={() => setAdvancedOpen((v) => !v)}
          className={
            advancedOpen
              ? 'border-primary bg-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50'
              : 'border-border bg-surface hover:border-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'
          }
        >
          <SlidersHorizontal size={15} />
          Filtros
          {activeFilterCount > 0 && (
            <span
              className={
                advancedOpen
                  ? 'rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] font-bold leading-none'
                  : 'bg-primary rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none text-white'
              }
            >
              {activeFilterCount}
            </span>
          )}
          <ChevronRight
            size={14}
            className={advancedOpen ? 'rotate-90 transition-transform' : 'transition-transform'}
          />
        </button>
      </div>

      {hasAnyFacetOptions && (
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => {
            const chipHasOptions =
              chip.field === 'q' ||
              (chip.field === 'areaAtuacao' && areaFacets.length > 0) ||
              (chip.field === 'profissao' && options.profissoes.length > 0) ||
              (chip.field === 'tag' && options.tags.length > 0) ||
              (chip.field === 'empresa' && options.empresas.length > 0) ||
              (chip.field === 'cidade' && options.cidades.length > 0);
            if (!chipHasOptions) return null;

            const isActive = chip.field === 'q' ? !activeChip : activeChip === chip.field;
            const className = isActive
              ? 'border-primary bg-primary min-h-[30px] rounded-full border px-3.5 py-1 text-[11px] font-bold text-white'
              : 'border-border bg-surface text-muted hover:border-primary min-h-[30px] rounded-full border px-3.5 py-1 text-[11px] font-bold transition-colors';

            if (chip.field === 'q') {
              return (
                <Link key={chip.label} href="/irmaos" className={className}>
                  {chip.label}
                </Link>
              );
            }
            return (
              <button
                key={chip.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => openAndFocus(chip.field)}
                className={className}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {hasAnyFacetOptions && (
        <div
          hidden={!advancedOpen}
          className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FacetSelect
              name="profissao"
              label="Profissão"
              value={filters.profissao}
              options={options.profissoes}
              selectRef={(el) => {
                fieldRefs.current.profissao = el;
              }}
            />
            {areaFacets.length > 0 && (
              <label className="flex flex-col gap-1.5 text-sm">
                Área de atuação
                <Select
                  ref={(el) => {
                    fieldRefs.current.areaAtuacao = el;
                  }}
                  name="areaAtuacao"
                  defaultValue={filters.areaAtuacao ?? ''}
                >
                  <option value="">Todas</option>
                  {areaFacets.map((area) => (
                    <option key={area.key} value={area.key}>
                      {AREA_ATUACAO_LABELS[area.key]} ({area.count})
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <FacetSelect
              name="tag"
              label="Competência ou serviço"
              value={filters.tag}
              options={options.tags}
              selectRef={(el) => {
                fieldRefs.current.tag = el;
              }}
            />
            <FacetSelect
              name="empresa"
              label="Empresa"
              value={filters.empresa}
              options={options.empresas}
              selectRef={(el) => {
                fieldRefs.current.empresa = el;
              }}
            />
            <FacetSelect
              name="cidade"
              label="Cidade"
              value={filters.cidade}
              options={options.cidades}
              selectRef={(el) => {
                fieldRefs.current.cidade = el;
              }}
            />
          </div>
          <button
            type="submit"
            className="bg-primary w-fit rounded-lg px-4 py-2 text-sm font-semibold text-white"
          >
            Aplicar filtros
          </button>
        </div>
      )}
    </form>
  );
}
