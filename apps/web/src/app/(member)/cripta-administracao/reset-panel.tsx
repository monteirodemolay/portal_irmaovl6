'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Status = {
  generation: number;
  state: 'idle' | 'draining' | 'resetting';
  resetId: string | null;
  completed: number;
  records: number;
  files: number;
  letters: number;
  drafts: number;
  legacyTests: number;
  activeOperations: number;
  failed?: number;
  waiting?: boolean;
};

export function ResetPanel() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [finished, setFinished] = useState(false);

  async function call(body?: object): Promise<Status> {
    const response = await fetch(
      '/api/cripta/reset',
      body
        ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        : { cache: 'no-store' },
    );
    const data = (await response.json()) as Status & { error?: string };
    if (!response.ok) throw new Error(data.error ?? 'Não foi possível conferir a zerada.');
    setStatus(data);
    return data;
  }
  async function inspect() {
    setBusy(true);
    setMessage('');
    setFinished(false);
    try {
      await call();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Conferência indisponível.');
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    if (!status) return;
    setBusy(true);
    setMessage('');
    setFinished(false);
    try {
      let current = status;
      if (current.state === 'idle')
        current = await call({
          action: 'start',
          generation: current.generation,
          confirmation,
          externalCopiesAcknowledged: acknowledged,
        });
      // Batches resume from persisted state after refresh, loss of network, or a closed tab.
      for (let batch = 0; batch < 100 && current.state !== 'idle'; batch++) {
        current = await call({ action: 'continue', resetId: current.resetId });
        if (current.failed) {
          setMessage(
            'Há arquivos cuja exclusão ainda não foi confirmada pelo Wix. A Cripta continua bloqueada. Aguarde um pouco e clique em Retomar zerada.',
          );
          return;
        }
        if (current.waiting && current.state !== 'idle') {
          setMessage(
            'Aguardando uma operação que já estava em andamento. Aguarde e retome. Se uma operação foi interrompida, o bloqueio de segurança pode durar até 15 minutos.',
          );
          return;
        }
      }
      if (current.state === 'idle') {
        setFinished(true);
        setConfirmation('');
        setAcknowledged(false);
        setMessage(
          'Zerada concluída. O recebimento está fechado. Faça uma nova inauguração, com novas chaves, para iniciar outro percurso.',
        );
        router.refresh();
      } else setMessage('A limpeza avançou. Clique em Retomar zerada para concluir.');
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Zerada interrompida. Confira o estado para retomar.',
      );
    } finally {
      setBusy(false);
    }
  }
  const ongoing = status && status.state !== 'idle';
  return (
    <section
      className="rounded-2xl border border-red-200 bg-red-50 p-6"
      aria-labelledby="reset-title"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
        Repetir o percurso de ensaio
      </p>
      <h2 id="reset-title" className="mt-2 font-serif text-2xl">
        Zerar Cripta para novo teste
      </h2>
      <p className="mt-3 text-sm leading-6">
        Use o funcionamento real: inaugure, abra o recebimento, escreva, deposite, feche, lacre,
        exporte e confira as três unidades. Quando terminar, você pode apagar este percurso e
        repetir quantas vezes precisar.
      </p>
      <p className="mt-3 text-sm leading-6">
        A zerada é definitiva: apaga cartas e anexos vinculados no Wix, rascunhos, chaves guardadas
        no Portal, Guardiões, Comissão, datas, recibos, conferências e ocorrências da Cripta desta
        Loja, além dos seus ensaios antigos. Os cadastros dos irmãos e os outros módulos são
        preservados. Ficam apenas o contador e a data da última zerada.
      </p>
      <p className="mt-3 text-sm font-semibold">
        Apague também as cópias baixadas, os arquivos dos Guardiões e os pen drives A, B e C. O
        Portal não apaga arquivos que já estão fora dele. Não reutilize as chaves do teste anterior.
      </p>
      <button
        type="button"
        onClick={inspect}
        disabled={busy}
        className="mt-5 rounded-xl border border-red-800 px-4 py-3 font-semibold disabled:opacity-50"
      >
        {busy ? 'Conferindo / zerando…' : 'Conferir dados antes de zerar'}
      </button>
      {status && (
        <div className="mt-5 space-y-4">
          <p className="text-sm" role="status">
            {status.letters} registro(s) de cartas · {status.drafts} rascunho(s) ·{' '}
            {status.legacyTests} ensaio(s) antigo(s).
            <br />
            Restam {status.files} arquivo(s) vinculado(s) e {status.records} registro(s). Zeradas
            concluídas: {status.completed}.
          </p>
          {ongoing ? (
            <p className="font-semibold">
              Zerada em andamento. A Cripta está bloqueada até concluir.
            </p>
          ) : (
            !finished && (
              <>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    disabled={busy}
                    className="mt-1"
                  />
                  <span>
                    Entendo que todos esses dados serão apagados definitivamente e que devo apagar
                    as cópias externas separadamente.
                  </span>
                </label>
                <label className="block text-sm font-semibold">
                  Digite ZERAR CRIPTA para confirmar
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    disabled={busy}
                    autoComplete="off"
                    className="mt-2 block w-full max-w-sm rounded-xl border border-red-300 bg-white p-3"
                  />
                </label>
              </>
            )
          )}
          {!finished && (
            <button
              type="button"
              onClick={reset}
              disabled={busy || (!ongoing && (confirmation !== 'ZERAR CRIPTA' || !acknowledged))}
              className="rounded-xl bg-red-800 px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {ongoing ? 'Retomar zerada' : 'Apagar os dados e reiniciar a Cripta'}
            </button>
          )}
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm leading-6">
          {message}
        </p>
      )}
      {finished && (
        <Link
          href="/cripta-administracao/inauguracao"
          className="mt-4 inline-block font-semibold underline"
        >
          Começar nova inauguração →
        </Link>
      )}
    </section>
  );
}
