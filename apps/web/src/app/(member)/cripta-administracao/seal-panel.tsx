'use client';

import { useEffect, useState } from 'react';

type Receipt = {
  code: string;
  sealedAt: string;
  inventoryDigest: string;
  receiptDigest: string;
  count: number;
  letters: number;
  drafts: number;
  minutes: string;
  status: string;
  previousCode: string | null;
  commissionMemberIds?: string[];
  nextOpeningDate?: string;
};
type Result = {
  receipt: Receipt | null;
  check?: {
    inventoryMatches: boolean;
    receiptMatches?: boolean;
    currentDigest?: string;
    error?: string;
  };
  error?: string;
};

export function SealPanel({ initiallyOpen }: { initiallyOpen: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/cripta/seal', { cache: 'no-store' })
      .then(async (response) => {
        const data = (await response.json()) as Result;
        if (!response.ok) throw new Error(data.error ?? 'Conferência indisponível.');
        setResult(data);
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Conferência indisponível.'),
      );
  }, []);

  async function seal() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      const data = (await response.json()) as { receipt?: Receipt; error?: string };
      if (!response.ok || !data.receipt) throw new Error(data.error ?? 'Recibo não gerado.');
      setResult({ receipt: data.receipt, check: { inventoryMatches: true, receiptMatches: true } });
      setMessage(
        'Recibo registrado. Baixe uma cópia e transcreva o código e o hash na ata da sessão.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o lacre.');
    } finally {
      setBusy(false);
    }
  }

  function download() {
    if (!result?.receipt) return;
    const blob = new Blob(
      [JSON.stringify({ format: 'vl6-seal-receipt-v1', ...result.receipt }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${result.receipt.code}-recibo.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const receipt = result?.receipt;
  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        Etapa 2 · registro verificável
      </p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">Recibo da lacração</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Após fechar a escrita, o Portal calcula um SHA-256 sobre o inventário de cartas e rascunhos
        cifrados, registra a data, a ata e um código único. Guarde o recibo fora do Portal e
        confira-o na próxima sessão.
      </p>
      {receipt && (
        <div className="mt-5 rounded-xl border border-[#c9a449] bg-[#fbf8f1] p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
            {receipt.status === 'sealed' ? 'Lacre vigente' : 'Último lacre aberto'}
          </p>
          <p className="mt-2 break-all font-mono text-lg font-bold text-[#123c69]">
            {receipt.code}
          </p>
          <p className="mt-2 text-sm">
            {new Date(receipt.sealedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}{' '}
            · Ata {receipt.minutes} · {receipt.letters} carta(s) · {receipt.drafts} rascunho(s)
          </p>
          {receipt.nextOpeningDate && (
            <p className="mt-2 text-sm">
              Na lacração, a abertura estava prevista para{' '}
              {new Date(receipt.nextOpeningDate + 'T12:00:00Z').toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
              })}
              . Remarcações constam do histórico da Comissão.
            </p>
          )}
          <p className="mt-3 break-all text-xs">
            <strong>SHA-256 do inventário:</strong> {receipt.inventoryDigest}
          </p>
          <p className="mt-2 break-all text-xs">
            <strong>SHA-256 do recibo:</strong> {receipt.receiptDigest}
          </p>
          {receipt.previousCode && (
            <p className="mt-2 text-xs">Lacre anterior: {receipt.previousCode}</p>
          )}
          <p
            className={`mt-3 text-sm font-semibold ${receipt.status !== 'sealed' ? 'text-[#725624]' : result?.check?.inventoryMatches ? 'text-green-800' : 'text-red-800'}`}
          >
            {receipt.status !== 'sealed'
              ? 'Este ciclo foi aberto. Após o próximo fechamento, registre um novo recibo.'
              : result?.check?.inventoryMatches && result?.check?.receiptMatches
                ? 'Recibo e inventário registrado conferem com o estado atual.'
                : 'Divergência ou conferência indisponível. Não abra até apurar.'}
          </p>
          <button
            type="button"
            onClick={download}
            className="mt-4 rounded-xl border border-[#9f7e3e] bg-white px-4 py-3 font-semibold"
          >
            Baixar recibo para a ata
          </button>
        </div>
      )}
      {!initiallyOpen && receipt?.status !== 'sealed' && (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm font-semibold">
            Ata da lacração
            <input
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
              maxLength={160}
              placeholder="Ex.: Ata 123/2026"
              className="mt-2 w-full rounded-xl border border-[#c9b98f] p-3"
            />
          </label>
          <button
            type="button"
            disabled={busy || minutes.trim().length < 5}
            onClick={seal}
            className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Conferindo…' : 'Registrar lacre do inventário'}
          </button>
        </div>
      )}
      <details className="mt-4 text-sm text-[#725624]">
        <summary className="cursor-pointer font-semibold">
          ? O código prova que os pen drives estão íntegros?
        </summary>
        <p className="mt-2">
          Não. Ele permite detectar alterações no inventário registrado quando comparado ao recibo
          guardado na ata. É preciso copiar, ler de volta e conferir as duas unidades externas
          separadamente. O hash do inventário não substitui esse ensaio nem prova ausência de acesso
          indevido.
        </p>
      </details>
      {message && (
        <p role="status" className="mt-3 rounded-lg bg-[#fbf8f1] p-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
