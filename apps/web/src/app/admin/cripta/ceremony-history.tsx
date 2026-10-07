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
  'commission-appointed': 'Comissão de Guarda nomeada',
  'commission-updated': 'Comissão de Guarda ou próxima data atualizada',
  opened: 'Recebimento de cartas aberto',
  closed: 'Recebimento de cartas encerrado',
  unsealed: 'Lacre anterior rompido para esta reabertura',
  sealed: 'Cripta lacrada — recibo emitido',
};

function formatAt(at: string | undefined) {
  if (!at) return '';
  return new Date(at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

/** A visão "só pra ver o que já foi feito" — mesma fonte de eventos do Projetor (que agora opera
 * a cerimônia), lida aqui em modo espectador: a Administração nunca grava nada nesta tela, só
 * acompanha com o mesmo polling de 5s. Extraída do antigo ProjetorScreen quando os formulários de
 * ação se mudaram pra lá — ver docs/architecture/cripta-reabertura-ficha-e-cerimonia.md. */
export function CeremonyHistory({ wizard }: { wizard: WizardResult }) {
  const [tab, setTab] = useState<Ceremony>(() => ceremonyForPhase(wizard.phase));
  const [events, setEvents] = useState<CeremonyEvent[]>([]);
  const activeCeremony = ceremonyForPhase(wizard.phase);

  useEffect(() => {
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

  return (
    <section className="rounded-2xl border border-[#e4dcc4] bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        Histórico · só visualização
      </p>
      <h2 className="mt-1 font-serif text-2xl text-[#142a43]">O que já foi feito</h2>
      <nav className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(CEREMONY_LABEL) as Ceremony[]).map((ceremony) => (
          <button
            key={ceremony}
            type="button"
            onClick={() => setTab(ceremony)}
            className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              tab === ceremony
                ? 'border-[#123c69] bg-[#123c69] text-white'
                : 'border-[#c9b98f] text-[#536074] hover:border-[#8a682d]'
            }`}
          >
            {CEREMONY_LABEL[ceremony]}
            {activeCeremony === ceremony && (
              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" />
            )}
          </button>
        ))}
      </nav>

      <ol className="mt-5 space-y-3">
        {events.length === 0 && (
          <li className="text-center text-sm text-[#8a9bb0]">
            Nenhum registro ainda para esta cerimônia.
          </li>
        )}
        {events.map((event) => (
          <li key={event.id} className="rounded-xl border border-[#e4dcc4] bg-[#fbf8f1] p-4">
            <p className="text-[#142a43]">{EVENT_LABEL[event.type ?? ''] ?? event.type}</p>
            <p className="mt-1 text-sm text-[#8a9bb0]">{formatAt(event.at)}</p>
            {Array.isArray(event.guardianMemberIds) && (
              <p className="mt-2 text-sm text-[#536074]">
                {(event.guardianMemberIds as string[]).length} Guardiões sorteados
              </p>
            )}
            {typeof event.minutes === 'string' && event.minutes && (
              <p className="mt-2 text-sm text-[#536074]">Ata: {event.minutes}</p>
            )}
          </li>
        ))}
      </ol>

      {events.length > 0 && (
        <div className="mt-5">
          <a
            href={`/api/cripta/ceremony-report?ceremony=${tab}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block rounded-xl border border-[#8a682d]/60 px-4 py-2 text-sm font-semibold text-[#8a682d] hover:bg-[#8a682d]/10"
          >
            Abrir relatório desta cerimônia para o registro histórico
          </a>
        </div>
      )}
    </section>
  );
}
