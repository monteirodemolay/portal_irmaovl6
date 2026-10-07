'use client';

import { useEffect, useState } from 'react';

type Guardian = { memberId: string; name: string; status: 'valida' | 'comprometida' };
type AlertLevel = 'ok' | 'atencao' | 'urgente' | 'critico';
type State = {
  inaugurated: boolean;
  total?: number;
  threshold?: number;
  validCount?: number;
  alertLevel?: AlertLevel;
  guardians?: Guardian[];
};

const ALERT_STYLE: Record<AlertLevel, string> = {
  ok: 'border-green-300 bg-green-50 text-green-900',
  atencao: 'border-amber-400 bg-amber-50 text-amber-950',
  urgente: 'border-orange-500 bg-orange-50 text-orange-950',
  critico: 'border-red-600 bg-red-50 text-red-950',
};

const ALERT_MESSAGE: Record<AlertLevel, string> = {
  ok: 'Todas as partes estão válidas.',
  atencao:
    'Uma parte não está mais confiável. Renovação recomendada na próxima oportunidade com os Guardiões reunidos.',
  urgente:
    'Restam só as partes mínimas para reconstruir a chave. Convoque a Renovação agora — qualquer nova perda torna a Cripta inacessível para sempre.',
  critico: 'Não há mais partes suficientes para reconstruir a chave.',
};

/** Rastreamento e alerta — não revogação. Uma parte Shamir marcada "comprometida" aqui continua
 * matematicamente capaz de ajudar a reconstruir a chave; isso só registra que a Loja não confia
 * mais nela, pra forçar uma decisão (Renovação) antes que faltem partes de verdade. */
export function GuardianSharesPanel() {
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reason, setReason] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  async function load() {
    const response = await fetch('/api/cripta/guardian-shares', { cache: 'no-store' });
    if (response.ok) setState(await response.json());
  }

  useEffect(() => {
    void load();
  }, []);

  async function change(memberId: string, status: 'valida' | 'comprometida') {
    setBusy(memberId);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/guardian-shares', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, status, reason: reason[memberId] ?? '' }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Não foi possível atualizar.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível atualizar.');
    } finally {
      setBusy(null);
    }
  }

  if (!state?.inaugurated || !state.guardians) return null;

  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <h2 className="font-serif text-xl text-[#142a43]">Partes dos Guardiões</h2>
      <p
        className={`mt-2 rounded-xl border p-3 text-sm font-semibold ${ALERT_STYLE[state.alertLevel!]}`}
      >
        {state.validCount} de {state.total} partes válidas (limiar {state.threshold}) —{' '}
        {ALERT_MESSAGE[state.alertLevel!]}
      </p>
      <div className="mt-4 divide-y">
        {state.guardians.map((guardian) => (
          <div key={guardian.memberId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="flex-1">{guardian.name}</span>
            <span
              className={
                guardian.status === 'valida'
                  ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-900'
                  : 'rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-900'
              }
            >
              {guardian.status === 'valida' ? 'Válida' : 'Comprometida'}
            </span>
            {guardian.status === 'valida' ? (
              <>
                <input
                  placeholder="Motivo (opcional, só para registro interno)"
                  value={reason[guardian.memberId] ?? ''}
                  onChange={(event) =>
                    setReason((entries) => ({
                      ...entries,
                      [guardian.memberId]: event.target.value,
                    }))
                  }
                  className="w-56 rounded-lg border px-2 py-1 text-xs"
                />
                <button
                  type="button"
                  disabled={busy === guardian.memberId}
                  onClick={() => change(guardian.memberId, 'comprometida')}
                  className="rounded-lg border border-red-700 px-3 py-2 text-xs font-semibold text-red-800 disabled:opacity-50"
                >
                  Registrar extravio/impedimento
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={busy === guardian.memberId}
                onClick={() => change(guardian.memberId, 'valida')}
                className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
              >
                Reverter (corrigir engano)
              </button>
            )}
          </div>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">
          {message}
        </p>
      )}
    </section>
  );
}
