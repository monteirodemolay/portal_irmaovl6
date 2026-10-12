'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_LABELS,
  suggestEventDefaults,
  type EventDefaults,
  type EventSuggestion,
  type EventTemplate,
} from '../lib/suggest-event-defaults';

function setNativeValue(element: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('pt-BR');
}

export function EventFormExperience({
  children,
  locationOptions,
  templates = [],
  cancelHref = '/admin/publicacoes',
}: {
  children: React.ReactNode;
  locationOptions: string[];
  /** Acontecimentos anteriores usados para sugerir o preenchimento. */
  templates?: EventTemplate[];
  cancelHref?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [locationValue, setLocationValue] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formReady, setFormReady] = useState(false);
  const [typed, setTyped] = useState({ tipo: '', titulo: '' });
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  const locations = useMemo(
    () =>
      [...new Set(locationOptions.map((item) => item.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'pt-BR'),
      ),
    [locationOptions],
  );
  const knownLocations = useMemo(() => new Set(locations.map(normalize)), [locations]);
  const isUnknown = Boolean(locationValue.trim()) && !knownLocations.has(normalize(locationValue));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const form = root.querySelector('form');
    const input = root.querySelector<HTMLInputElement>('input[name="local"]');
    if (!form || !input) return;

    setFormReady(true);
    setLocationValue(input.value);
    input.setAttribute('list', 'vl6-event-location-options');
    input.setAttribute('autocomplete', 'off');

    const onInput = () => setLocationValue(input.value);
    input.addEventListener('input', onInput);

    const tipoField = form.querySelector<HTMLSelectElement>('select[name="tipo"]');
    const tituloField = form.querySelector<HTMLInputElement>('input[name="titulo"]');
    const readTyped = () =>
      setTyped({ tipo: tipoField?.value ?? '', titulo: tituloField?.value ?? '' });
    readTyped();
    tipoField?.addEventListener('change', readTyped);
    tituloField?.addEventListener('input', readTyped);
    return () => {
      input.removeEventListener('input', onInput);
      tipoField?.removeEventListener('change', readTyped);
      tituloField?.removeEventListener('input', readTyped);
    };
  }, []);

  const suggestion = useMemo<EventSuggestion | null>(
    () => (templates.length ? suggestEventDefaults(templates, typed) : null),
    [templates, typed],
  );
  const suggestionKey = suggestion ? `${suggestion.source.id}` : null;

  function applySuggestion(found: EventSuggestion) {
    const form = rootRef.current?.querySelector('form');
    if (!form) return;
    const fill = (name: string, value: string, onlyIfEmpty: boolean) => {
      const field = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (field && (!onlyIfEmpty || !field.value.trim())) setNativeValue(field, value);
    };
    const d: EventDefaults = found.defaults;
    if (d.local) fill('local', d.local, false);
    if (d.traje) fill('traje', d.traje, true);
    if (d.chegadaSugerida) fill('chegadaSugerida', d.chegadaSugerida, true);
    if (d.capacidadeMaxima) fill('capacidadeMaxima', String(d.capacidadeMaxima), true);
    if (d.exigeConfirmacaoPresenca) {
      const box = form.querySelector<HTMLInputElement>('input[name="exigeConfirmacaoPresenca"]');
      if (box && !box.checked) box.click();
    }
    setApplied(found.source.id);
  }

  function submitForm() {
    const form = rootRef.current?.querySelector<HTMLFormElement>('form');
    form?.requestSubmit();
  }

  return (
    <div ref={rootRef} data-event-form-experience className="space-y-5">
      <datalist id="vl6-event-location-options">
        {locations.map((location) => (
          <option key={location} value={location} />
        ))}
      </datalist>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="border-accent bg-accent/10 rounded-2xl border p-4">
          <p className="text-accent text-xs font-semibold uppercase tracking-wide">1 · Essencial</p>
          <p className="mt-1 font-semibold">Registre o fato</p>
          <p className="text-muted mt-1 text-xs">
            Tipo, título, data e local são a base do Acontecimento.
          </p>
        </div>
        <div className="border-border bg-surface rounded-2xl border p-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            2 · Complementos
          </p>
          <p className="mt-1 font-semibold">Complete quando souber</p>
          <p className="text-muted mt-1 text-xs">
            Descrição, presença, traje e anexos podem ser incluídos sem pressa.
          </p>
        </div>
        <div className="border-border bg-surface rounded-2xl border p-4">
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            3 · Depois do evento
          </p>
          <p className="mt-1 font-semibold">Construa a memória</p>
          <p className="text-muted mt-1 text-xs">
            Notícia, fotos, vídeos, documentos e Acervo ficam na mesma Ficha.
          </p>
        </div>
      </div>

      {formReady && suggestion && suggestionKey !== dismissed && suggestionKey !== applied && (
        <div
          role="region"
          aria-label="Sugestão de preenchimento"
          className="border-accent/40 bg-accent/5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold">Repetir dados de “{suggestion.source.titulo}”?</p>
            <p className="text-muted mt-1 text-sm">
              {suggestion.reason[0]!.toUpperCase() + suggestion.reason.slice(1)}, em{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                timeZone: 'America/Sao_Paulo',
                dateStyle: 'short',
              }).format(new Date(suggestion.source.dataInicio))}
              . Preenche:{' '}
              {(Object.keys(suggestion.defaults) as (keyof EventDefaults)[])
                .map((key) => DEFAULT_LABELS[key])
                .join(', ')}
              . Data e título não mudam; traje, chegada e capacidade só entram se estiverem vazios.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => applySuggestion(suggestion)}
              className="bg-primary min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            >
              Preencher
            </button>
            <button
              type="button"
              onClick={() => setDismissed(suggestionKey)}
              className="border-border min-h-11 rounded-xl border px-4 py-2 text-sm font-medium"
            >
              Ignorar
            </button>
          </div>
        </div>
      )}
      {applied && (
        <p role="status" className="text-sm text-emerald-800">
          Dados repetidos do acontecimento anterior. Confira data e horário antes de salvar.
        </p>
      )}

      <div className="border-border bg-surface rounded-2xl border p-5 md:p-6">{children}</div>

      {formReady && isUnknown && (
        <div className="border-accent/40 bg-accent/5 flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Local ainda não utilizado no Portal</p>
            <p className="text-muted mt-1 text-sm">
              “{locationValue}” não aparece entre os locais já usados. Você pode confirmá-lo sem
              sair deste cadastro.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="border-accent text-accent min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold"
          >
            Usar este novo local
          </button>
        </div>
      )}

      {formReady && (
        <div className="border-border bg-surface/95 sticky bottom-3 z-30 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 shadow-xl backdrop-blur">
          <p className="text-muted hidden text-sm md:block">
            As ações permanecem disponíveis enquanto você preenche.
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={cancelHref}
              className="border-border min-h-11 rounded-xl border px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </Link>
            <button
              type="button"
              onClick={submitForm}
              className="bg-primary min-h-11 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
            >
              Salvar e continuar
            </button>
          </div>
        </div>
      )}

      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-location-title"
        >
          <button
            type="button"
            aria-label="Fechar painel"
            className="absolute inset-0 bg-black/35"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="bg-surface border-border relative z-10 flex h-full w-full max-w-md flex-col border-l shadow-2xl">
            <div className="border-border border-b p-5">
              <p className="text-accent text-xs font-semibold uppercase tracking-wide">
                Cadastro contextual
              </p>
              <h2 id="new-location-title" className="font-display mt-1 text-2xl font-semibold">
                Usar novo local
              </h2>
              <p className="text-muted mt-2 text-sm">
                Você não precisa abandonar o Acontecimento para registrar um local que ainda não
                apareceu na Agenda.
              </p>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="border-border rounded-xl border p-4">
                <p className="text-muted text-xs font-semibold uppercase tracking-wide">
                  Local informado
                </p>
                <p className="mt-1 font-semibold">{locationValue}</p>
              </div>
              <p className="text-muted text-sm">
                Ao salvar este Acontecimento, este local passa a ser reconhecido nas sugestões dos
                próximos cadastros. Assim evitamos um cadastro paralelo apenas para locais.
              </p>
            </div>
            <div className="border-border flex gap-2 border-t p-4">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="border-border min-h-11 flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="bg-primary min-h-11 flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              >
                Confirmar local
              </button>
            </div>
          </aside>
        </div>
      )}

      <style jsx global>{`
        [data-event-form-experience] form {
          max-width: none !important;
        }
        [data-event-form-experience] form > button[type='submit'] {
          display: none;
        }
        [data-event-form-experience] form input,
        [data-event-form-experience] form select,
        [data-event-form-experience] form textarea {
          min-height: 44px;
        }
      `}</style>
    </div>
  );
}
