import { AREA_ATUACAO_KEYS, AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import { Input, Search, Select, SlidersHorizontal } from '@vl6/ui';

export interface DirectoryFiltersValues {
  q?: string;
  profissao?: string;
  areaAtuacao?: AreaAtuacaoKey;
  competencia?: string;
  servico?: string;
  empresa?: string;
  cidade?: string;
}

const QUICK_CHIPS: Array<{ label: string; field: keyof DirectoryFiltersValues | 'q' }> = [
  { label: 'Todos', field: 'q' },
  { label: 'Profissão', field: 'profissao' },
  { label: 'Competências', field: 'competencia' },
  { label: 'Empresas', field: 'empresa' },
  { label: 'Área de atuação', field: 'areaAtuacao' },
  { label: 'Cidade', field: 'cidade' },
];

export function DirectorySearchPanel({ filters }: { filters: DirectoryFiltersValues }) {
  const activeChip = (
    Object.entries(filters) as Array<[keyof DirectoryFiltersValues, string | undefined]>
  ).find(([key, value]) => key !== 'q' && value)?.[0];

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
        <a
          href="#filtros-avancados"
          className="border-border bg-surface hover:border-primary flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors"
        >
          <SlidersHorizontal size={15} />
          Filtros
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_CHIPS.map((chip) => (
          <span
            key={chip.label}
            className={
              chip.field === 'q' && !activeChip
                ? 'border-primary bg-primary min-h-[30px] rounded-full border px-3.5 py-1 text-[11px] font-bold text-white'
                : activeChip === chip.field
                  ? 'border-primary bg-primary min-h-[30px] rounded-full border px-3.5 py-1 text-[11px] font-bold text-white'
                  : 'border-border bg-surface text-muted min-h-[30px] rounded-full border px-3.5 py-1 text-[11px] font-bold'
            }
          >
            {chip.label}
          </span>
        ))}
      </div>

      <details id="filtros-avancados" className="border-border bg-surface rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Filtros refinados</summary>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5 text-sm">
            Profissão
            <Input name="profissao" defaultValue={filters.profissao ?? ''} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Área de atuação
            <Select name="areaAtuacao" defaultValue={filters.areaAtuacao ?? ''}>
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
            <Input name="competencia" defaultValue={filters.competencia ?? ''} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Serviço
            <Input name="servico" defaultValue={filters.servico ?? ''} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Empresa
            <Input name="empresa" defaultValue={filters.empresa ?? ''} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            Cidade
            <Input name="cidade" defaultValue={filters.cidade ?? ''} />
          </label>
        </div>
        <button
          type="submit"
          className="bg-primary mt-4 w-fit rounded-lg px-4 py-2 text-sm font-semibold text-white"
        >
          Aplicar filtros
        </button>
      </details>
    </form>
  );
}
