'use client';

import { useState } from 'react';

export function OnlineOpeningControl({ initiallyOpen }: { initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function change(next: boolean) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/online-opening', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ open: next }),
      });
      const data = await response.json() as { open?: boolean; error?: string };
      if (!response.ok || data.open !== next) throw new Error(data.error ?? 'Alteração não confirmada.');
      setOpen(next);
      setMessage(next ? 'Recebimento aberto. As cartas enviadas serão guardadas no Wix.' : 'Recebimento fechado. As cartas já guardadas continuam no Wix.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível alterar o estado.'); }
    finally { setBusy(false); }
  }

  return <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
    <h2 className="font-serif text-2xl text-[#142a43]">Recebimento de cartas no Wix</h2>
    <p className="mt-2 text-sm text-[#536074]">Estado atual: <strong>{open ? 'aberto' : 'fechado'}</strong>. A alteração é registrada com data e usuário.</p>
    <button type="button" disabled={busy} onClick={() => change(!open)} className="mt-4 rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50">
      {busy ? 'Atualizando…' : open ? 'Fechar recebimento' : 'Abrir recebimento'}
    </button>
    {message && <p role="status" className="mt-3 text-sm text-[#142a43]">{message}</p>}
  </section>;
}
