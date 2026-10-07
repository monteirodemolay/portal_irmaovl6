'use client';

import { useState } from 'react';

type Props = {
  initiallyOpen: boolean;
  masterName: string;
  commissionMemberIds: string[];
  nextOpeningDate: string;
  choices: Array<{ id: string; name: string }>;
  step: string;
  /** True quando a data marcada pela Comissão (nextOpeningDate) já chegou ou passou — mostra um
   * aviso em destaque em vez do texto neutro "abertura prevista para". Não há abertura
   * automática por cron neste ambiente: isto só lembra o operador de abrir manualmente. */
  due?: boolean;
};

export function OnlineOpeningControl({
  initiallyOpen,
  masterName,
  commissionMemberIds,
  nextOpeningDate,
  choices,
  step,
  due,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [minutes, setMinutes] = useState('');
  const [code, setCode] = useState('');
  const [presentMemberId, setPresentMemberId] = useState(
    initiallyOpen ? (commissionMemberIds[0] ?? '') : '',
  );
  const [durationDays, setDurationDays] = useState(10);
  const [reason, setReason] = useState('');
  const [presentMemberIds, setPresentMemberIds] = useState<string[]>([]);
  const [presentOthersText, setPresentOthersText] = useState('');
  const opening = !initiallyOpen;
  const outsideCommission =
    opening && !!presentMemberId && !commissionMemberIds.includes(presentMemberId);
  const displayDate = nextOpeningDate
    ? new Date(nextOpeningDate + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC' })
    : 'data não definida';

  async function change() {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/online-opening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          open: opening,
          minutes,
          code,
          presentMemberId,
          reason,
          durationDays,
          presentMemberIds,
          presentOthers: presentOthersText
            .split('\n')
            .map((name) => name.trim())
            .filter(Boolean),
        }),
      });
      const data = (await response.json()) as { open?: boolean; error?: string };
      if (!response.ok || data.open !== opening)
        throw new Error(data.error ?? 'Alteração não confirmada.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o ato.');
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        {step} · ato em sessão
      </p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">
        {opening ? 'Registrar abertura' : 'Registrar fechamento'}
      </h2>
      {opening && due && (
        <p className="mt-3 rounded-xl border border-[#c9a449] bg-[#fbeecb] p-4 text-sm font-semibold text-[#142a43]">
          Hoje é o dia marcado para a abertura ({displayDate}) — ou já passou. Abra agora para
          liberar a escrita a todos os irmãos Ativos, inclusive os que entraram depois da última
          abertura.
        </p>
      )}
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        {opening
          ? (due
              ? 'Registre quem compareceu. '
              : `Abertura prevista para ${displayDate}. Registre agora quem compareceu. `) +
            'A data pode ter sido remarcada na Comissão acima.'
          : 'O Venerável vigente preside o fechamento com um integrante da Comissão. Depois de fechar, emita o recibo abaixo.'}
      </p>
      <div className="mt-4 rounded-xl border border-[#c9a449] bg-white p-4 text-sm">
        <strong>Venerável Mestre vigente:</strong> {masterName || 'Não identificado'}
        <p className="mt-1 text-[#536074]">
          Comissão de Guarda:{' '}
          {commissionMemberIds
            .map(
              (id) => choices.find((choice) => choice.id === id)?.name ?? 'Integrante indisponível',
            )
            .join(', ') || 'Não nomeada'}
        </p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Ata da sessão
          <input
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            maxLength={160}
            placeholder="Ex.: Ata 123/2026"
            className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"
          />
        </label>
        <label className="text-sm font-semibold">
          {opening ? 'Integrante presente na abertura' : 'Integrante presente no fechamento'}
          <select
            value={presentMemberId}
            onChange={(event) => setPresentMemberId(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"
          >
            <option value="">Selecione</option>
            {choices
              .filter((entry) => opening || commissionMemberIds.includes(entry.id))
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                  {opening && commissionMemberIds.includes(entry.id) ? ' · Comissão' : ''}
                </option>
              ))}
          </select>
        </label>
        <div className="text-sm font-semibold sm:col-span-2">
          Demais presentes na sessão <span className="font-normal text-[#607084]">(opcional)</span>
          <div className="mt-2 grid max-h-40 gap-2 overflow-y-auto rounded-xl border border-[#c9b98f] bg-white p-3 sm:grid-cols-2">
            {choices.map((entry) => (
              <label key={entry.id} className="flex items-center gap-2 text-sm font-normal">
                <input
                  type="checkbox"
                  checked={presentMemberIds.includes(entry.id)}
                  onChange={(event) =>
                    setPresentMemberIds((ids) =>
                      event.target.checked
                        ? [...ids, entry.id]
                        : ids.filter((id) => id !== entry.id),
                    )
                  }
                />
                {entry.name}
              </label>
            ))}
          </div>
          <textarea
            value={presentOthersText}
            onChange={(event) => setPresentOthersText(event.target.value)}
            placeholder="Outros presentes sem conta vinculada ao Portal, um nome por linha"
            rows={2}
            className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 font-normal"
          />
          <p className="mt-1 text-xs text-[#607084]">
            Só enriquece o registro da ata — não é exigido para abrir ou fechar.
          </p>
        </div>
        {opening && (
          <label className="text-sm font-semibold">
            Prazo de recebimento (dias)
            <input
              type="number"
              min={1}
              max={30}
              value={durationDays}
              onChange={(event) => setDurationDays(Number(event.target.value))}
              className="mt-2 w-full rounded-xl border p-3"
            />
          </label>
        )}
        {opening && (
          <label className="text-sm font-semibold sm:col-span-2">
            Código da última lacração (deixe vazio na primeira abertura)
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              autoComplete="off"
              placeholder="VL6-AAAAMMDD-XXXXXXXXXXXX"
              className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 font-mono"
            />
          </label>
        )}
        {outsideCommission && (
          <label className="text-sm font-semibold sm:col-span-2">
            Por que outra pessoa está abrindo?
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={300}
              placeholder="Ex.: substituição aprovada na Ata 125/2027"
              className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"
            />
          </label>
        )}
      </div>
      <button
        type="button"
        disabled={
          busy ||
          !masterName ||
          !commissionMemberIds.length ||
          !presentMemberId ||
          minutes.trim().length < 5 ||
          (opening && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 30)) ||
          (outsideCommission && reason.trim().length < 8)
        }
        onClick={change}
        className="mt-5 rounded-xl bg-[#123c69] px-6 py-3 font-semibold text-white disabled:opacity-50"
      >
        {busy ? 'Registrando…' : opening ? 'Conferir lacre e abrir' : 'Fechar a escrita'}
      </button>
      <details className="mt-4 text-sm text-[#725624]">
        <summary className="cursor-pointer font-semibold">? Quem pode comparecer?</summary>
        <p className="mt-2">
          No fechamento, o Venerável e um integrante da Comissão. Na abertura, o Venerável vigente e
          um irmão Ativo escolhido na própria sessão. Se ele não integra a Comissão de Guarda
          registrada, informe o motivo em ata. O Portal registra a conta operadora; não colhe duas
          assinaturas independentes.
        </p>
      </details>
      {message && (
        <p role="status" className="mt-3 rounded-lg bg-white p-3 text-sm text-red-900">
          {message}
        </p>
      )}
    </section>
  );
}
