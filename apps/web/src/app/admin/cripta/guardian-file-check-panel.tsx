'use client';
import { useRef, useState } from 'react';
import {
  checkGuardianFile,
  MAX_GUARDIAN_FILE_BYTES,
  type GuardianCheckReference,
} from '@/modules/cripta/lib/guardian-file-check';

export function GuardianFileCheckPanel() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  async function verify(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage('Lendo a parte e consultando o registro atual…');
    try {
      if (file.size > MAX_GUARDIAN_FILE_BYTES)
        throw new Error('Selecione apenas o arquivo JSON da parte do Guardião.');
      const response = await fetch('/api/cripta/guardian-file-check', { cache: 'no-store' });
      const reference = (await response.json()) as GuardianCheckReference & { error?: string };
      if (!response.ok)
        throw new Error(reference.error ?? 'Não foi possível consultar a Cripta atual.');
      const result = await checkGuardianFile(await file.text(), reference);
      setMessage(
        `Parte ${result.part} · ${result.guardian}. ${
          result.integrity === 'confirmed'
            ? 'Integridade confirmada: a parte corresponde à impressão digital registrada na geração.'
            : 'Arquivo legível e compatível com a chave atual, mas sem impressão digital de origem. A integridade da parte secreta não pode ser confirmada individualmente.'
        } ${
          result.compromised
            ? 'Atenção: esta parte está marcada como comprometida na Administração. A conferência não altera esse registro.'
            : ''
        }`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Conferência não concluída.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <section
      className="rounded-2xl border border-[#d8c8a4] bg-white p-6"
      aria-labelledby="guardian-file-check"
    >
      <h2 id="guardian-file-check" className="font-serif text-2xl">
        Conferir pen drive de um Guardião
      </h2>
      <p className="mt-3 text-sm leading-6">
        Conecte o pen drive e selecione diretamente nele o arquivo JSON da parte da chave. Basta uma
        parte; não é necessário reunir os demais Guardiões nem abrir cartas.
      </p>
      <label className="mt-4 block text-sm font-semibold">
        Arquivo da parte da chave
        <input
          ref={input}
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            void verify(event.target.files?.[0]);
          }}
          className="mt-2 block w-full rounded-lg border p-3"
        />
      </label>
      <p className="mt-3 text-sm text-[#5e584c]">
        A leitura ocorre neste navegador. O arquivo e a parte secreta não são enviados ao servidor.
        A verificação confere o conteúdo lido agora; não diagnostica a saúde física do pen drive nem
        garante sua conservação futura.
      </p>
      <p className="mt-2 text-sm text-[#5e584c]">
        Arquivos antigos sem impressão digital podem ter resultado inconclusivo. Nesse caso, a
        conferência completa exige o procedimento de recuperação com o quórum de Guardiões.
      </p>
      {message && (
        <p
          role="status"
          aria-live="polite"
          className="mt-4 rounded-lg bg-slate-100 p-4 text-sm leading-6"
        >
          {message}
        </p>
      )}
    </section>
  );
}
