'use client';

import { useState } from 'react';

export function WixTestButton() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function run() {
    setBusy(true);
    setMessage('Executando envio, conferência e exclusão do pacote fictício…');
    try {
      const response = await fetch('/api/cripta/ensaio-wix', { method: 'POST', credentials: 'same-origin' });
      const data = await response.json() as {
        encrypted?: boolean; privateFile?: boolean; integrity?: boolean; deleted?: boolean; error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'Falha no ensaio.');
      setMessage(`Criptografia: ${data.encrypted ? 'OK' : 'falhou'} · Privacidade: ${data.privateFile ? 'OK' : 'falhou'} · Integridade: ${data.integrity ? 'OK' : 'falhou'} · Exclusão: ${data.deleted ? 'solicitada' : 'falhou'}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível concluir o ensaio.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="rounded-2xl border border-[#dbcda9] bg-white p-7">
    <h2 className="font-serif text-2xl text-[#142a43]">Ensaio técnico · Wix</h2>
    <p className="mt-2 text-sm leading-6 text-[#41516a]">Gera somente dados aleatórios, criptografa um pacote de 1 KB, envia como arquivo privado, confere a cópia recuperada e solicita sua exclusão permanente. Este teste não recebe cartas nem arquivos de irmãos.</p>
    <button type="button" disabled={busy} onClick={run} className="mt-4 rounded-lg bg-[#0a2547] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Testando…' : 'Executar ensaio fictício'}</button>
    {message && <p role="status" className="mt-4 text-sm text-[#41516a]">{message}</p>}
  </section>;
}
