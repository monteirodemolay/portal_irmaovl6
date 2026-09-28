'use client';

import { useState } from 'react';

type Props = { initiallyOpen: boolean; masterName: string; openingSecondId: string; closingSecondId: string;
  choices: Array<{ id: string; name: string }> };

export function OnlineOpeningControl({ initiallyOpen, masterName, openingSecondId, closingSecondId, choices }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [minutes, setMinutes] = useState('');
  const [code, setCode] = useState('');
  const [actingSecondId, setActingSecondId] = useState(initiallyOpen ? closingSecondId : openingSecondId);
  const [reason, setReason] = useState('');
  const next = !initiallyOpen;
  const principal = next ? openingSecondId : closingSecondId;

  async function change() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/cripta/online-opening', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open: next, minutes, code, actingSecondId, reason }),
      });
      const data = await response.json() as { open?: boolean; error?: string };
      if (!response.ok || data.open !== next) throw new Error(data.error ?? 'Alteração não confirmada.');
      window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível alterar o estado.'); setBusy(false); }
  }

  return <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
    <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">Etapa {next ? '3' : '2'} · ato em sessão</p>
    <h2 className="mt-2 font-serif text-2xl text-[#142a43]">{next ? 'Deslacrar e abrir' : 'Encerrar o recebimento'}</h2>
    <p className="mt-2 text-sm leading-6 text-[#536074]">Estado atual: <strong>{initiallyOpen ? 'aberto' : 'fechado'}</strong>. Primeiro responsável pelo cargo: <strong>{masterName || 'Venerável não identificado'}</strong>. O ato registra o operador da conta e os nomes indicados na ata; ainda não coleta duas assinaturas digitais independentes.</p>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold">Ata da sessão deste ato<input value={minutes} onChange={(event) => setMinutes(event.target.value)} maxLength={160} placeholder="Ex.: Ata 123/2026" className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3" /></label>
      <label className="text-sm font-semibold">Segundo responsável presente<select value={actingSecondId} onChange={(event) => setActingSecondId(event.target.value)} className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"><option value="">Selecione</option>{choices.filter((entry) => entry.id === principal || entry.id !== (next ? closingSecondId : openingSecondId)).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.id === principal ? ' · indicado' : ' · substituto'}</option>)}</select></label>
      {next && <label className="text-sm font-semibold sm:col-span-2">Código do recibo da última lacração<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoComplete="off" placeholder="VL6-AAAAMMDD-XXXXXXXXXXXX" className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 font-mono" /></label>}
      {actingSecondId && actingSecondId !== principal && <label className="text-sm font-semibold sm:col-span-2">Motivo da substituição<input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Registre a deliberação da substituição" className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3" /></label>}
    </div>
    <button type="button" disabled={busy || !masterName || !actingSecondId || minutes.trim().length < 5 || (next && !code.trim()) || (actingSecondId !== principal && reason.trim().length < 8)} onClick={change} className="mt-5 rounded-xl bg-[#123c69] px-6 py-3 font-semibold text-white disabled:opacity-50">
      {busy ? 'Registrando…' : next ? 'Conferir código e abrir' : 'Fechar a escrita'}
    </button>
    <details className="mt-4 text-sm text-[#725624]"><summary className="cursor-pointer font-semibold">? O que acontece neste ato?</summary><p className="mt-2">{next ? 'O sistema compara o código e o hash do inventário atual com o recibo anterior antes de permitir novas cartas. Se houver divergência, suspenda a abertura.' : 'Novas cartas deixam de ser recebidas. Em seguida, registre o recibo de lacração abaixo e confira separadamente as duas unidades externas.'}</p></details>
    {message && <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm text-red-900">{message}</p>}
  </section>;
}
