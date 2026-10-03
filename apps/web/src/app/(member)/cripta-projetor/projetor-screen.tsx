'use client';

import { useEffect, useState } from 'react';
import {
  ceremonyForPhase,
  type Ceremony,
  type WizardResult,
} from '@/modules/cripta/lib/cycle-wizard';

type CeremonyEvent = { id: string; type?: string; at?: string; [key: string]: unknown };

const CEREMONY_LABEL: Record<Ceremony, string> = {
  inauguracao: 'Inauguração',
  abertura: 'Abertura',
  fechamento: 'Fechamento',
  reabertura: 'Reabertura',
};

const EVENT_LABEL: Record<string, string> = {
  'sorteio.resultado': 'Sorteio dos Guardiões realizado',
  'sorteio.redraw': 'Sorteio refeito',
  inaugurated: 'Cripta inaugurada — chave gerada e dividida entre os Guardiões',
  opened: 'Recebimento de cartas aberto',
  closed: 'Recebimento de cartas encerrado',
  unsealed: 'Lacre anterior rompido para esta reabertura',
  sealed: 'Cripta lacrada — recibo emitido',
};

function formatAt(at: string | undefined) {
  if (!at) return '';
  return new Date(at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ProjetorScreen() {
  const [wizard, setWizard] = useState<WizardResult | null>(null);
  const [tab, setTab] = useState<Ceremony | null>(null);
  const [events, setEvents] = useState<CeremonyEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch('/api/cripta/ceremony-status', { cache: 'no-store' });
        if (!response.ok) throw new Error('status indisponível');
        const body = (await response.json()) as { wizard: WizardResult };
        if (cancelled) return;
        setWizard(body.wizard);
        setTab((current) => current ?? ceremonyForPhase(body.wizard.phase));
        setError('');
      } catch {
        if (!cancelled) setError('Não foi possível atualizar o estado da cerimônia agora.');
      }
    }
    void poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!tab) return;
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/cripta/ceremony-log?ceremony=${tab}`, {
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('log indisponível');
        const body = (await response.json()) as { events: CeremonyEvent[] };
        if (!cancelled) setEvents(body.events);
      } catch {
        if (!cancelled) setEvents([]);
      }
    }
    void load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tab]);

  const activeCeremony = wizard ? ceremonyForPhase(wizard.phase) : null;
  const liveStep = wizard?.steps.find((step) => step.status === 'current');
  const ceremonyDone = tab !== null && activeCeremony !== null && tab !== activeCeremony;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,#1b3a5c,#06172e_60%)] px-6 py-10 text-white sm:px-14">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[.3em] text-[#e3bd62]">
          Loja Maçônica Verdadeira Luz nº 06 · Cripta do Irmão
        </p>
        <h1 className="mt-3 font-serif text-4xl sm:text-5xl">Projetor da Cripta</h1>
      </header>

      <nav className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-3">
        {(Object.keys(CEREMONY_LABEL) as Ceremony[]).map((ceremony) => (
          <button
            key={ceremony}
            type="button"
            onClick={() => setTab(ceremony)}
            className={`rounded-full border px-5 py-3 text-sm font-semibold uppercase tracking-wide transition ${
              tab === ceremony
                ? 'border-[#e3bd62] bg-[#e3bd62] text-[#142a43]'
                : 'border-white/30 text-white/80 hover:border-white/60'
            }`}
          >
            {CEREMONY_LABEL[ceremony]}
            {ceremony === 'inauguracao' && (
              <span className="ml-2 rounded-full bg-black/30 px-2 py-0.5 text-[10px] normal-case tracking-normal">
                ato único
              </span>
            )}
            {activeCeremony === ceremony && (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-400 align-middle" />
            )}
          </button>
        ))}
      </nav>

      {error && (
        <p
          role="alert"
          className="mx-auto mt-6 max-w-xl rounded-xl bg-red-900/40 p-3 text-center text-sm text-red-100"
        >
          {error}
        </p>
      )}

      <main className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-white/15 bg-white/5 p-8 backdrop-blur sm:p-12">
        {tab && activeCeremony === tab && (
          <p className="rounded-xl border border-emerald-400/40 bg-emerald-950/40 p-4 text-center text-lg">
            ⏳ Em andamento — {wizard?.phaseLabel ?? liveStep?.label ?? 'cerimônia em curso'}
          </p>
        )}
        {ceremonyDone && (
          <p className="rounded-xl border border-[#e3bd62]/50 bg-[#e3bd62]/10 p-4 text-center text-lg">
            ✓ Concluída — aguardando autorização para a próxima etapa
          </p>
        )}

        <ol className="mt-8 space-y-4">
          {events.length === 0 && (
            <li className="text-center text-white/60">
              Nenhum registro ainda para esta cerimônia.
            </li>
          )}
          {events.map((event) => (
            <li key={event.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <p className="text-lg">{EVENT_LABEL[event.type ?? ''] ?? event.type}</p>
              <p className="mt-1 text-sm text-white/60">{formatAt(event.at)}</p>
              {Array.isArray(event.guardianMemberIds) && (
                <p className="mt-2 text-sm text-white/80">
                  {(event.guardianMemberIds as string[]).length} Guardiões sorteados
                </p>
              )}
              {typeof event.minutes === 'string' && event.minutes && (
                <p className="mt-2 text-sm text-white/80">Ata: {event.minutes}</p>
              )}
            </li>
          ))}
        </ol>

        {tab && events.length > 0 && (
          <div className="mt-8 text-center">
            <a
              href={`/api/cripta/ceremony-report?ceremony=${tab}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl border border-[#e3bd62]/60 px-5 py-3 text-sm font-semibold text-[#e3bd62] hover:bg-[#e3bd62]/10"
            >
              Abrir relatório desta cerimônia para os anais
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
