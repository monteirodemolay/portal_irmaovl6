'use client';

import { useEffect, useState, type ChangeEvent } from 'react';

async function sha256(bytes: ArrayBuffer): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function UnitCheck() {
  const [letters, setLetters] = useState<Array<{ id: string; createdAt: string }>>([]);
  const [expected, setExpected] = useState('');
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/cripta/online-capsules', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível carregar as cartas enviadas.');
        setLetters((await response.json() as { items: typeof letters }).items);
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Falha ao carregar cartas.'));
  }, []);

  async function exportLetter(id: string) {
    setBusy(true); setMessage(''); setExpected(''); setSelected('');
    try {
      const response = await fetch(`/api/cripta/online-capsules/${id}/export`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Não foi possível baixar o pacote cifrado da carta.');
      const bytes = await response.arrayBuffer();
      const checksum = await sha256(bytes);
      if (checksum !== response.headers.get('X-Cripta-SHA256')) throw new Error('A conferência do download falhou.');
      setExpected(checksum); setSelected(id);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `cripta-carta-${id}.json`;
      document.body.append(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage('Pacote cifrado baixado do Wix. Copie o download para a unidade externa e selecione o arquivo diretamente dessa unidade para confirmar a cópia.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Exportação falhou.'); }
    finally { setBusy(false); }
  }

  async function checkFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !expected) return;
    setBusy(true);
    try {
      const actual = await sha256(await file.arrayBuffer());
      setMessage(actual === expected
        ? 'Cópia conferida: o arquivo selecionado da unidade externa é idêntico ao pacote cifrado baixado do Wix.'
        : 'A cópia não corresponde ao pacote baixado. Repita a cópia e a conferência.');
    } catch { setMessage('Não foi possível ler o arquivo da unidade externa.'); }
    finally { setBusy(false); event.target.value = ''; }
  }

  return <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
    <h2 className="font-serif text-2xl text-[#142a43]">Guardar em unidade externa</h2>
    <p className="mt-2 text-sm leading-6 text-[#536074]">Escolha uma carta enviada, baixe seu pacote cifrado do Wix e copie o arquivo para o pen drive ou SSD. Em seguida, selecione o arquivo da unidade para conferir se a cópia ficou idêntica. O conteúdo da carta não aparece nesta área.</p>
    {letters.length ? <div className="mt-5 space-y-3">{letters.map((letter) => <div key={letter.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 text-sm"><span>Enviada em {new Date(letter.createdAt).toLocaleString('pt-BR')}</span><button type="button" disabled={busy} onClick={() => exportLetter(letter.id)} className="rounded-lg bg-[#123c69] px-4 py-2 font-semibold text-white disabled:opacity-50">Baixar pacote cifrado</button></div>)}</div>
      : <p className="mt-5 rounded-xl border border-dashed p-4 text-sm text-[#536074]">Nenhuma carta enviada nesta conta. Escreva e envie uma carta em “Minhas cartas” para iniciar a guarda.</p>}
    {selected && <label className="mt-5 inline-block cursor-pointer rounded-xl border border-[#a78648] bg-white px-5 py-3 font-semibold">Conferir arquivo do pen drive ou SSD<input type="file" accept=".json,application/json" disabled={busy} onChange={checkFile} className="sr-only" /></label>}
    {message && <p role="status" aria-live="polite" className="mt-4 rounded-xl bg-white p-4 text-sm">{message}</p>}
    {expected && <p className="mt-3 break-all text-xs text-[#536074]">SHA-256 do pacote: {expected}</p>}
  </section>;
}
