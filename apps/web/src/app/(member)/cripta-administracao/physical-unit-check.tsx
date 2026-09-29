'use client';

import { useState } from 'react';
import {
  comparePhysicalUnits,
  inspectPhysicalUnit,
  type UnitEvidence,
} from '@/modules/cripta/lib/physical-unit';

type Evidence = {
  code: string;
  fingerprint: string;
  size: number;
  totalLetters: number;
  inventoryDigest: string;
  units: string[];
  checkedAt?: string;
  operatorId?: string;
  method?: string;
};

export function PhysicalUnitCheck({
  receiptCode,
  totalLetters,
  inventoryDigest,
  recorded,
}: {
  receiptCode: string;
  totalLetters: number;
  inventoryDigest: string;
  recorded?: Evidence | null;
}) {
  const [files, setFiles] = useState<Array<{ lacre: File | null; manifest: File | null }>>([
    { lacre: null, manifest: null },
    { lacre: null, manifest: null },
  ]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<Evidence | null>(recorded ?? null);

  function choose(index: number, kind: 'lacre' | 'manifest', selected: File | null) {
    setFiles((current) =>
      current.map((entry, position) =>
        position === index ? { ...entry, [kind]: selected } : entry,
      ),
    );
    setMessage('');
  }

  async function verify() {
    setBusy(true);
    setMessage('Lendo as duas unidades. Mantenha ambas conectadas até terminar…');
    try {
      const results: UnitEvidence[] = [];
      for (const [index, entry] of files.entries()) {
        if (!entry.lacre || !entry.manifest)
          throw new Error(`Selecione o lacre e o manifesto da unidade ${index + 1}.`);
        results.push(await inspectPhysicalUnit(entry.lacre, await entry.manifest.text()));
      }
      const evidence = comparePhysicalUnits(
        results[0]!,
        results[1]!,
        receiptCode,
        totalLetters,
        inventoryDigest,
      );
      const response = await fetch('/api/cripta/physical-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evidence),
      });
      const data = (await response.json()) as { evidence?: Evidence; error?: string };
      if (!response.ok || !data.evidence)
        throw new Error(data.error ?? 'Não foi possível registrar a conferência.');
      setResult(data.evidence);
      setMessage('Leitura concluída e registrada. Guarde os manifestos nas respectivas unidades.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível conferir as unidades.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6 text-[#142a43]">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        Conferência física · duas unidades
      </p>
      <h2 className="mt-2 font-serif text-2xl">Ler as cópias gravadas</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Depois de copiar o mesmo arquivo CRIPTA/2 para duas unidades externas, selecione diretamente
        de cada uma o arquivo .lacre e seu próprio manifesto. O navegador lê os arquivos e compara a
        impressão digital, o código e o inventário emitido pelo Portal. Os arquivos não são enviados
        ao Portal.
      </p>
      <p className="mt-3 text-sm font-semibold">
        Código esperado: <span className="font-mono">{receiptCode}</span> · {totalLetters} carta(s)
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {files.map((_, index) => (
          <fieldset
            key={index}
            disabled={busy}
            className="rounded-xl border border-[#dbcda9] bg-[#fbf8f1] p-4"
          >
            <legend className="px-2 font-semibold">Unidade {index + 1}</legend>
            <label className="block text-sm">
              Arquivo .lacre
              <input
                type="file"
                accept=".lacre"
                onChange={(event) => choose(index, 'lacre', event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm"
              />
            </label>
            <label className="mt-4 block text-sm">
              Manifesto desta unidade
              <input
                type="file"
                accept=".json,application/json"
                onChange={(event) => choose(index, 'manifest', event.target.files?.[0] ?? null)}
                className="mt-2 block w-full text-sm"
              />
            </label>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || files.some((entry) => !entry.lacre || !entry.manifest)}
        onClick={() => {
          void verify();
        }}
        className="mt-5 rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Conferindo…' : 'Conferir e registrar as duas cópias'}
      </button>
      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-[#dbcda9] bg-[#fbf8f1] p-3 text-sm"
        >
          {message}
        </p>
      )}
      {result && (
        <div className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-950">
          <strong>Última conferência registrada</strong>
          <p className="mt-2 break-all font-mono">{result.fingerprint}</p>
          <p className="mt-2">
            Unidades: {result.units.join(' e ')}
            {result.checkedAt ? ` · ${new Date(result.checkedAt).toLocaleString('pt-BR')}` : ''}
          </p>
        </div>
      )}
      <details className="mt-4 text-sm text-[#725624]">
        <summary className="cursor-pointer font-semibold">? O que a conferência prova?</summary>
        <p className="mt-2">
          Ela detecta corrupção nas duas cópias selecionadas e confere seus manifestos com o código
          do recibo. O servidor registra o resultado declarado pelo navegador; não consegue observar
          fisicamente os pen drives. Antes de excluir dados do Wix, ainda será preciso testar a
          abertura e a recuperação de cartas com as partes da chave.
        </p>
      </details>
    </section>
  );
}
