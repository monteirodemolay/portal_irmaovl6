'use client';

import { useState } from 'react';

type Restoration = {
  restoredDrafts: number;
  skippedDrafts: number;
  archivedLetters: number;
  failed: Array<{ uid: string; error: string }>;
  complete: boolean;
  at: string;
};

type Props = { receiptCode: string; recorded: Restoration | null };

export function RestorePanel({ receiptCode, recorded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Restoration | null>(recorded);

  async function restore() {
    if (!file) return;
    setBusy(true);
    setMessage('');
    try {
      const form = new FormData();
      form.set('file', file);
      const response = await fetch('/api/cripta/restore', { method: 'POST', body: form });
      const data = (await response.json()) as { restoration?: Restoration; error?: string };
      if (!data.restoration) throw new Error(data.error ?? 'Restauração não confirmada.');
      setResult(data.restoration);
      setMessage(
        data.restoration.complete
          ? `Restaurado: ${data.restoration.restoredDrafts} rascunho(s) trazido(s) de volta ao Wix, ${data.restoration.skippedDrafts} já presentes. ${data.restoration.archivedLetters} carta(s) selada(s) seguem só nas unidades físicas.`
          : `Restauração parcial: ${data.restoration.failed.length} falha(s). Veja abaixo antes de liberar a abertura.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível restaurar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6 text-[#142a43]">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        8 · preparação · mesmo pen drive
      </p>
      <h2 className="mt-2 font-serif text-2xl">Restaurar rascunhos para o novo ciclo</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Selecione, de uma das unidades já conferidas, o mesmo arquivo <code>.lacre</code> deste
        lacre (<span className="font-mono">{receiptCode}</span>). Só os <strong>rascunhos</strong>{' '}
        voltam ao Wix — cada irmão continua o que não havia concluído. As{' '}
        <strong>cartas já seladas</strong> não voltam: elas usam a chave única da Cripta, que só os
        Guardiões reunidos, offline, conseguem abrir, então permanecem apenas nas unidades físicas
        até a entrega. Nada é enviado ao Portal além do arquivo — a leitura acontece aqui mesmo, no
        servidor, só para reencaminhar os rascunhos ainda cifrados.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Arquivo .lacre da unidade
        <input
          type="file"
          accept=".lacre"
          disabled={busy}
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-sm"
        />
      </label>
      <button
        type="button"
        disabled={busy || !file}
        onClick={() => {
          void restore();
        }}
        className="mt-5 rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Restaurando…' : result ? 'Restaurar de novo' : 'Restaurar rascunhos'}
      </button>
      {message && (
        <p role="status" className="mt-4 rounded-lg bg-[#fbf8f1] p-3 text-sm">
          {message}
        </p>
      )}
      {result && (
        <div
          className={`mt-4 rounded-xl border p-4 text-sm ${result.complete ? 'border-green-300 bg-green-50 text-green-950' : 'border-red-300 bg-red-50 text-red-950'}`}
        >
          <strong>{result.complete ? 'Restauração concluída' : 'Restauração incompleta'}</strong>
          <p className="mt-2">
            {result.restoredDrafts} rascunho(s) restaurado(s) · {result.skippedDrafts} já
            presente(s) · {result.archivedLetters} carta(s) selada(s) fora do Portal
            {result.at ? ` · ${new Date(result.at).toLocaleString('pt-BR')}` : ''}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 list-inside list-disc">
              {result.failed.map((entry) => (
                <li key={entry.uid}>
                  {entry.uid}: {entry.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <details className="mt-4 text-sm text-[#725624]">
        <summary className="cursor-pointer font-semibold">
          ? Por que as cartas seladas não voltam?
        </summary>
        <p className="mt-2">
          Colocá-las de volta no Wix reintroduziria, sem necessidade, o mesmo risco que a custódia
          por Guardiões foi criada para eliminar. Elas já estão seguras nas três unidades físicas; a
          única forma de abri-las é reunir ao menos três Guardiões e usar a ferramenta offline
          (scripts/cripta/abertura-offline), no momento de entregar a carta ao destinatário — nunca
          pelo Portal.
        </p>
      </details>
    </section>
  );
}
