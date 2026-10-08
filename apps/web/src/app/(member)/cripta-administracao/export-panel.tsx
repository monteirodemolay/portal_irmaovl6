'use client';

import { useState } from 'react';
import { buildPenDriveCode, fingerprintLacre } from '@/modules/cripta/lib/physical-unit';

type Props = {
  receiptCode: string;
  totalLetters: number;
  inventoryDigest: string;
};

const UNITS = ['A', 'B', 'C'] as const;

export function ExportPanel({ receiptCode, totalLetters, inventoryDigest }: Props) {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [fingerprint, setFingerprint] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  function trigger(fileBlob: Blob, filename: string) {
    const url = URL.createObjectURL(fileBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function download() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/export', { cache: 'no-store' });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Exportação falhou.');
      }
      const fileBlob = await response.blob();
      setBlob(fileBlob);
      setFingerprint(await fingerprintLacre(fileBlob));
      trigger(fileBlob, `${receiptCode}.lacre`);
      setMessage(
        'Arquivo .lacre baixado. Copie exatamente este arquivo, sem renomear nem alterar, para cada unidade externa — nunca gere um novo arquivo por unidade.',
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Exportação falhou.');
    } finally {
      setBusy(false);
    }
  }

  function downloadManifest(unit: string) {
    if (!blob || !fingerprint) return;
    const manifest = {
      formato: 'CRIPTA/2' as const,
      codigoLacracao: receiptCode,
      codigoPenDrive: buildPenDriveCode(receiptCode, unit),
      impressaoDigital: fingerprint,
      tamanho: blob.size,
      totalCartas: totalLetters,
      inventoryDigest,
    };
    trigger(
      new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
      `manifesto-unidade-${unit}.json`,
    );
  }

  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">5 · exportar</p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">
        Exportação para as unidades físicas
      </h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Gera um único arquivo com todas as cartas e rascunhos já cifrados deste lacre — o mesmo
        arquivo vai para cada unidade externa (A, B e a reserva C).
      </p>
      <ol className="mt-4 list-inside list-decimal space-y-2 text-sm text-[#536074]">
        <li>
          Baixar o arquivo <code>.lacre</code> (uma vez).
        </li>
        <li>Copiar o mesmo arquivo para as unidades A, B e C.</li>
        <li>Baixar o manifesto de cada unidade e guardá-lo junto dela.</li>
        <li>Seguir para "6 · Conferência física", logo abaixo nesta página.</li>
      </ol>
      <button
        type="button"
        disabled={busy}
        onClick={download}
        className="mt-5 rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Trabalhando…' : blob ? 'Baixar o .lacre de novo' : 'Baixar arquivo .lacre'}
      </button>
      {blob && (
        <div className="mt-4 flex flex-wrap gap-3">
          {UNITS.map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => downloadManifest(unit)}
              className="rounded-xl border border-[#a78648] bg-[#faf7ef] px-4 py-2 text-sm font-semibold"
            >
              Manifesto Unidade {unit}
            </button>
          ))}
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-lg bg-[#fbf8f1] p-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
