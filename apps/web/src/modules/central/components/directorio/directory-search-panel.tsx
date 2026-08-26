'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { AREA_ATUACAO_KEYS, AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import { ChevronRight, Input, Search, Select, SlidersHorizontal } from '@vl6/ui';

export interface DirectoryFiltersValues {
  q?: string;
  profissao?: string;
  areaAtuacao?: AreaAtuacaoKey;
  competencia?: string;
  servico?: string;
  empresa?: string;
  cidade?: string;
}

type QuickChipField = Exclude<keyof DirectoryFiltersValues, 'servico'> | 'q';

const QUICK_CHIPS: Array<{ label: string; field: QuickChipField }> = [
  { label: 'Todos', field: 'q' },
  { label: 'Profissão', field: 'profissao' },
  { label: 'Competências', field: 'competencia' },
  { label: 'Empresas', field: 'empresa' },
  { label: 'Área de atuação', field: 'areaAtuacao' },
  { label: 'Cidade', field: 'cidade' },
];

/**
 * Um chip de campo de destino (`AREA_EXPLORE_GRID` já resolve "Área de
 * atuação" com clique único de verdade, contagem e tudo — este painel cobre
 * o resto, que é texto livre e não dá pra virar seleção de um clique só).
 * Antes cada chip era um `<a href="#âncora">`: o navegador focava o
 * `<details>` sem dar nenhum retorno visual perceptível (o painel quase
 * sempre já estava visível), então parecia que o clique "não fazia nada".
 * Agora o painel é controlado por estado real — o botão "Filtros" mostra
 * `aria-expanded` e muda de cor ao abrir/fechar, e cada chip abre o painel E
 * foca o campo correspondente (cursor piscando = feedback inequívoco de
 * clique), sem depender de comportamento implícito do navegador.
 */
export function DirectorySearchPanel({ filters }: { filters: DirectoryFiltersValues }) {
  const activeChip = (
    Object.entries(filters) as Array<[keyof DirectoryFiltersValues, string | undefined]>
  ).find(([key, value]) => key !== 'q' && value)?.[0];

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
          onClick={() => setAdvancedOpen((v) => !v)}
          className={
            advancedOpen
              ? 'border-primary bg-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-white transition-colors'
              : 'border-border bg-surface hover:border-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors'
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

      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => {
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

      <div
        hidden={!advancedOpen}
        className="border-border bg-surface flex flex-col gap-4 rounded-xl border p-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            Profissão
            <Input
              ref={(el) => {
                fieldRefs.current.profissao = el;
              }}
              name="profissao"
              defaultValue={filters.profissao ?? ''}
            />
          </label>
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
              {AREA_ATUACAO_KEYS.map((key) => (
                <option key={key} value={key}>
                  {AREA_ATUACAO_LABELS[key]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Competência
            <Input
              ref={(el) => {
                fieldRefs.current.competencia = el;
              }}
              name="competencia"
              defaultValue={filters.competencia ?? ''}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Serviço
            <Input name="servico" defaultValue={filters.servico ?? ''} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Empresa
            <Input
              ref={(el) => {
                fieldRefs.current.empresa = el;
              }}
              name="empresa"
              defaultValue={filters.empresa ?? ''}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Cidade
            <Input
              ref={(el) => {
                fieldRefs.current.cidade = el;
              }}
              name="cidade"
              defaultValue={filters.cidade ?? ''}
            />
          </label>
        </div>
        <button
          type="submit"
          className="bg-primary w-fit rounded-lg px-4 py-2 text-sm font-semibold text-white"
        >
          Aplicar filtros
        </button>
      </div>
    </form>
  );
}
