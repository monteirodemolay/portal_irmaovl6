'use client';

import { useMemo, useState } from 'react';
import { Button, Card, CardContent, EmptyState, Input, cn } from '@vl6/ui';

export interface LibraryLabelData {
  copyId: string;
  svg: string;
  titulo: string;
  codigoTombo: string;
  localizacaoLabel: string;
}

/**
 * Lista + seleção das etiquetas antes de imprimir. O Bibliotecário decide o
 * que sai na impressão: tudo, só uma obra, um exemplar avulso, ou várias
 * cópias da mesma etiqueta (pra ter uma de reserva quando uma se perde ou é
 * arrancada do livro sem querer). A área realmente impressa (`print:grid`)
 * só existe pra impressão — na tela só aparece a lista com checkboxes.
 */
export function LibraryLabelSheet({ labels }: { labels: LibraryLabelData[] }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(labels.map((l) => [l.copyId, true])),
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(labels.map((l) => [l.copyId, 1])),
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return labels;
    return labels.filter(
      (l) => l.titulo.toLowerCase().includes(term) || l.codigoTombo.toLowerCase().includes(term),
    );
  }, [query, labels]);

  function toggle(copyId: string, value: boolean) {
    setSelected((current) => ({ ...current, [copyId]: value }));
  }
  function setQuantity(copyId: string, value: number) {
    setQuantities((current) => ({ ...current, [copyId]: Math.min(20, Math.max(1, value || 1)) }));
  }
  function selectVisible(value: boolean) {
    setSelected((current) => {
      const next = { ...current };
      for (const l of filtered) next[l.copyId] = value;
      return next;
    });
  }

  const selectedCount = labels.filter((l) => selected[l.copyId]).length;
  const toPrint = labels.flatMap((l) =>
    selected[l.copyId]
      ? Array.from({ length: Math.max(1, quantities[l.copyId] ?? 1) }, () => l)
      : [],
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Input
            placeholder="Buscar por título ou tombo…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => selectVisible(true)}>
              {query ? 'Selecionar estes' : 'Selecionar todos'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => selectVisible(false)}>
              Limpar seleção
            </Button>
            <Button type="button" disabled={toPrint.length === 0} onClick={() => window.print()}>
              Imprimir{toPrint.length ? ` ${toPrint.length} etiqueta(s)` : ''}
            </Button>
          </div>
        </div>
        <p className="text-muted text-xs">
          {selectedCount} de {labels.length} exemplar(es) selecionado(s). Aumente a quantidade de um
          exemplar pra imprimir mais de uma etiqueta dele — útil quando uma etiqueta se perde ou sai
          do livro sem querer e precisa de uma nova.
        </p>

        {filtered.length === 0 ? (
          <EmptyState title="Nenhum exemplar encontrado" />
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((l) => (
              <li
                key={l.copyId}
                className={cn(
                  'rounded-lg border p-3',
                  selected[l.copyId] ? 'border-primary bg-primary/5' : 'border-border',
                )}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id={`label-${l.copyId}`}
                    className="accent-primary mt-1 h-4 w-4 shrink-0"
                    checked={Boolean(selected[l.copyId])}
                    onChange={(event) => toggle(l.copyId, event.target.checked)}
                  />
                  <label
                    htmlFor={`label-${l.copyId}`}
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3"
                  >
                    <div
                      className="h-12 w-12 shrink-0 overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: l.svg }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{l.titulo}</p>
                      <p className="text-muted truncate text-xs">
                        Tombo {l.codigoTombo} · {l.localizacaoLabel}
                      </p>
                    </div>
                  </label>
                </div>
                {selected[l.copyId] && (
                  <div className="mt-2 flex items-center gap-1.5 pl-7 text-xs">
                    <label htmlFor={`qty-${l.copyId}`} className="text-muted">
                      Cópias desta etiqueta:
                    </label>
                    <input
                      id={`qty-${l.copyId}`}
                      type="number"
                      min={1}
                      max={20}
                      value={quantities[l.copyId] ?? 1}
                      onChange={(event) => setQuantity(l.copyId, Number(event.target.value))}
                      className="border-border h-7 w-14 rounded border px-1.5 text-xs"
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <section className="hidden print:grid print:grid-cols-3 print:gap-2">
        {toPrint.map((l, index) => (
          <Card
            key={`${l.copyId}-${index}`}
            className="break-inside-avoid overflow-hidden print:rounded-md print:shadow-none"
          >
            <CardContent className="grid min-w-0 grid-cols-[96px_minmax(0,1fr)] items-center gap-3 p-3 text-left print:gap-2 print:p-2">
              <div
                className="h-24 w-24 shrink-0 overflow-hidden [&_svg]:block [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: l.svg }}
              />
              <div className="min-w-0 border-l pl-3 print:pl-2">
                <p className="text-primary text-[9px] font-semibold uppercase tracking-[0.12em]">
                  Biblioteca VL6
                </p>
                <h2 className="mt-1 line-clamp-2 break-words text-xs font-semibold leading-tight">
                  {l.titulo}
                </h2>
                <p className="mt-2 truncate font-mono text-[10px] font-bold">{l.codigoTombo}</p>
                <p className="text-muted mt-0.5 truncate text-[9px]">{l.localizacaoLabel}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
