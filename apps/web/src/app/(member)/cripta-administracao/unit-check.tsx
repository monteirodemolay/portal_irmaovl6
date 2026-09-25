'use client';

import { useState, type ChangeEvent } from 'react';
import { sealCapsule } from '@/modules/cripta/lib/sealed-capsule';

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function UnitCheck() {
  const [id, setId] = useState('');
  const [expected, setExpected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function createAndDownload() {
    setBusy(true); setMessage('');
    try {
      const fixture = new TextEncoder().encode(JSON.stringify({
        format: 'vl6-unit-check-v1', marker: crypto.randomUUID(), note: 'Conteúdo fictício para conferência de cópia.',
      }));
      const sealed = await sealCapsule(fixture, crypto.randomUUID() + crypto.randomUUID());
      const sent = await fetch('/api/cripta/test-capsules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sealed),
      });
      const record = await sent.json() as { id?: string; error?: string };
      if (!sent.ok || !record.id) throw new Error(record.error || 'O Wix não confirmou o envio.');
      setId(record.id);
      const received = await fetch(`/api/cripta/test-capsules/${record.id}`, { cache: 'no-store' });
      if (!received.ok) throw new Error('O Wix recebeu o pacote, mas não foi possível baixá-lo.');
      const bytes = await received.arrayBuffer();
      setExpected(await sha256(bytes));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `cripta-ensaio-${record.id}.json`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage('Upload e leitura do Wix confirmados. Salve o arquivo baixado no pen drive ou SSD. Depois selecione o arquivo diretamente dessa unidade para conferir.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'A conferência falhou.'); }
    finally { setBusy(false); }
  }

  async function checkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !expected) return;
    setBusy(true);
    try {
      const actual = await sha256(await file.arrayBuffer());
      setMessage(actual === expected
        ? 'Cópia conferida: o arquivo selecionado da unidade é idêntico ao baixado do Wix.'
        : 'A cópia não corresponde ao arquivo baixado. Não use esta unidade como guarda.');
    } catch { setMessage('Não foi possível ler o arquivo desta unidade.'); }
    finally { setBusy(false); event.target.value = ''; }
  }

  async function remove() {
    if (!id) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/cripta/test-capsules/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Exclusão no Wix não confirmada.');
      setId(''); setExpected(''); setMessage('Pacote fictício excluído do Wix. A cópia na unidade externa deve ser apagada por você.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Exclusão não confirmada.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
    <h2 className="font-serif text-2xl text-[#142a43]">Conferir Wix e unidade externa</h2>
    <p className="mt-2 text-sm leading-6 text-[#536074]">Este ensaio usa somente dados fictícios. O navegador baixa o pacote cifrado; você o copia para o pen drive ou SSD e seleciona o arquivo da unidade para verificar se os bytes são idênticos.</p>
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={createAndDownload} className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50">1. Enviar ao Wix e baixar</button>
      <label className="cursor-pointer rounded-xl border border-[#a78648] bg-white px-5 py-3 font-semibold">2. Conferir arquivo da unidade<input type="file" accept=".json,application/json" disabled={busy || !expected} onChange={checkFile} className="sr-only" /></label>
      {id && <button type="button" disabled={busy} onClick={remove} className="rounded-xl border px-5 py-3 disabled:opacity-50">Excluir ensaio do Wix</button>}
    </div>
    {message && <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-white p-4 text-sm">{message}</p>}
    {expected && <p className="mt-3 break-all text-xs text-[#536074]">SHA-256 esperado: {expected}</p>}
  </section>;
}
