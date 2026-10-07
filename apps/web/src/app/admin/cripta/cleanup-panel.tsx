'use client';

import { useState } from 'react';

type Props = {
  physicalCheckOk: boolean;
  cleanupComplete: boolean;
};

/** Passo 7, isolado do painel de exportação (passo 5) e renderizado DEPOIS da conferência física
 * (passo 6) em page.tsx — antes, o botão de limpeza vivia dentro do mesmo painel do download,
 * acima da conferência na página, obrigando o operador a rolar pra baixo pra conferir e depois
 * voltar pra cima pra limpar. Ordem visual agora bate com a ordem de execução: 5 → 6 → 7, sem
 * precisar ir e voltar. */
export function CleanupPanel({ physicalCheckOk, cleanupComplete }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function cleanup() {
    if (
      !window.confirm(
        'Solicitar exclusão de todos os objetos do Wix agora? Só confirme depois que as três unidades já estiverem gravadas e conferidas.',
      )
    )
      return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/export/cleanup', { method: 'POST' });
      const data = (await response.json()) as {
        cleanup?: {
          complete: boolean;
          deletedLetters: number;
          deletedDrafts: number;
          failed: unknown[];
        };
        error?: string;
      };
      if (!data.cleanup) throw new Error(data.error ?? 'Limpeza não confirmada.');
      setMessage(
        data.cleanup.complete
          ? `Limpeza concluída: ${data.cleanup.deletedLetters} carta(s) e ${data.cleanup.deletedDrafts} rascunho(s) removidos do Wix.`
          : `Limpeza parcial: ${data.cleanup.failed.length} falha(s). Não declare a Cripta fechada até resolver — veja o histórico.`,
      );
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Limpeza não confirmada.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        7 · limpeza do Wix
      </p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">Solicitar a limpeza</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Último passo deste lacre: pede ao Wix a exclusão de todos os objetos já exportados e
        conferidos acima. A partir daqui, o conteúdo só existe nas três unidades físicas externas.
      </p>
      {cleanupComplete && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">
          Limpeza do Wix já registrada para este lacre.
        </p>
      )}
      {!cleanupComplete && (
        <div className="mt-5">
          <button
            type="button"
            disabled={busy || !physicalCheckOk}
            onClick={cleanup}
            className="rounded-xl border border-red-700 px-5 py-3 font-semibold text-red-800 disabled:opacity-40"
          >
            {busy ? 'Trabalhando…' : '7 · Solicitar limpeza do Wix'}
          </button>
          {!physicalCheckOk && (
            <p className="mt-2 text-xs text-[#795521]">
              Conferir as três unidades gravadas (6 · acima) antes de liberar este botão.
            </p>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-lg bg-[#fbf8f1] p-3 text-sm">
          {message}
        </p>
      )}
      <details className="mt-4 text-sm text-[#725624]">
        <summary className="cursor-pointer font-semibold">
          ? Uma resposta de limpeza prova que os dados sumiram?
        </summary>
        <p className="mt-2">
          Não. Ela confirma que o Portal solicitou e o Wix aceitou a exclusão dos objetos listados —
          não prova ausência de backups internos do provedor. Trate como o passo final de um
          processo que já validou três cópias físicas restauráveis antes.
        </p>
      </details>
    </section>
  );
}
