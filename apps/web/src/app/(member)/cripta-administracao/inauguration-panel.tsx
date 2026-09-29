'use client';

import { useState } from 'react';
import { generateCriptaKeypair, type CriptaPublicKey } from '@/modules/cripta/lib/cripta-key';
import { splitSecret, type Share } from '@/modules/cripta/lib/shamir';

type Member = { id: string; name: string };
type Existing = {
  publicKey: CriptaPublicKey;
  totalGuardians: number;
  threshold: number;
  guardianMemberIds: string[];
  minutes: string;
  inauguratedAt: string;
} | null;

const TOTAL = 5;
const THRESHOLD = 3;

function downloadShare(
  guardianName: string,
  share: Share,
  publicKey: CriptaPublicKey,
  minutes: string,
  inauguratedAt: string,
) {
  const payload = {
    format: 'vl6-cripta-guardian-share-v1',
    aviso:
      'NÃO COMPARTILHE ESTE ARQUIVO. Guarde-o separado dos demais Guardiões, fora do Portal, fora de e-mail. ' +
      `Sozinho, este arquivo não abre carta nenhuma — são necessárias ${THRESHOLD} partes reunidas fisicamente.`,
    guardiao: guardianName,
    parte: share.x,
    totalPartes: TOTAL,
    limiar: THRESHOLD,
    valor: btoa(String.fromCharCode(...share.y)),
    chavePublicaCripta: publicKey,
    ata: minutes,
    inauguradoEm: inauguratedAt,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `cripta-guardiao-${share.x}-de-${TOTAL}-${guardianName.replace(/\s+/g, '-').toLowerCase()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function InaugurationPanel({
  eligible,
  existing,
  masterName,
}: {
  eligible: Member[];
  existing: Existing;
  masterName: string;
}) {
  const [guardianIds, setGuardianIds] = useState<string[]>(Array(TOTAL).fill(''));
  const [minutes, setMinutes] = useState('');
  const [generated, setGenerated] = useState<{
    publicKey: CriptaPublicKey;
    shares: Share[];
    inauguratedAt: string;
  } | null>(null);
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  if (existing) {
    return (
      <section className="rounded-2xl border border-green-300 bg-green-50 p-6 text-green-950">
        <h2 className="font-serif text-2xl">Cripta inaugurada</h2>
        <p className="mt-2 text-sm leading-6">
          Em{' '}
          {new Date(existing.inauguratedAt).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          })}{' '}
          · Ata {existing.minutes} · {existing.totalGuardians} Guardiões, limiar{' '}
          {existing.threshold}.
        </p>
        <p className="mt-2 text-sm leading-6">
          Toda carta guardada a partir de agora é cifrada com a chave pública desta cerimônia. A
          rotação de chave (trocar Guardiões ou renovar a chave) ainda não está implementada como
          ato no Portal.
        </p>
      </section>
    );
  }

  const distinctChosen = guardianIds.filter(Boolean);
  const validSelection =
    distinctChosen.length === TOTAL &&
    new Set(distinctChosen).size === TOTAL &&
    minutes.trim().length >= 5;

  async function generate() {
    setBusy(true);
    setMessage('');
    try {
      const { publicKey, privateScalar } = await generateCriptaKeypair();
      const shares = splitSecret(privateScalar, TOTAL, THRESHOLD);
      privateScalar.fill(0); // the scalar itself is never kept once split
      setGenerated({ publicKey, shares, inauguratedAt: new Date().toISOString() });
      setMessage(
        `Chave gerada nesta sessão e fragmentada em ${TOTAL} partes. Baixe e entregue cada parte a um Guardião diferente, agora, nesta sala.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gerar a chave.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmInauguration() {
    if (!generated) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/inauguration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: generated.publicKey,
          totalGuardians: TOTAL,
          threshold: THRESHOLD,
          guardianMemberIds: distinctChosen,
          minutes: minutes.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Inauguração não confirmada.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inauguração não confirmada.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#c9a449] bg-[#fbf8f1] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        Ato único · sessão fechada
      </p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">Inauguração da Cripta</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">
        Presidida pelo Venerável Mestre vigente ({masterName || 'não identificado'}). Nomeia os{' '}
        {TOTAL} Guardiões da Cripta e gera, nesta própria sessão, a chave única que vai proteger
        todas as cartas. A chave privada nunca é enviada ao Portal: nasce no navegador, é
        fragmentada em {TOTAL} partes na hora, e cada parte sai desta sala com um Guardião
        diferente. {THRESHOLD} partes reunidas reconstroem a chave; menos que isso não serve para
        nada.
      </p>

      {!generated && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: TOTAL }, (_, index) => (
              <label key={index} className="text-sm font-semibold">
                Guardião {index + 1}
                <select
                  value={guardianIds[index]}
                  onChange={(event) =>
                    setGuardianIds((ids) =>
                      ids.map((id, position) => (position === index ? event.target.value : id)),
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"
                >
                  <option value="">Selecione</option>
                  {eligible
                    .filter(
                      (member) =>
                        !guardianIds.includes(member.id) || guardianIds[index] === member.id,
                    )
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>
            ))}
            <label className="text-sm font-semibold sm:col-span-2">
              Ata da sessão de inauguração
              <input
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
                maxLength={160}
                minLength={5}
                placeholder="Ex.: Ata 130/2026"
                className="mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3"
              />
            </label>
          </div>
          <button
            type="button"
            disabled={busy || !validSelection}
            onClick={generate}
            className="mt-5 rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Gerando…' : 'Gerar a chave da Cripta agora'}
          </button>
        </>
      )}

      {generated && (
        <div className="mt-6 space-y-4">
          <p className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <strong>Faça isto agora, nesta sala, antes de continuar.</strong> Baixe cada parte e
            entregue fisicamente ao respectivo Guardião — nunca por e-mail, nunca fotografada, nunca
            as {TOTAL} juntas no mesmo aparelho depois deste momento.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {generated.shares.map((share, index) => {
              const guardian = eligible.find((member) => member.id === distinctChosen[index]);
              return (
                <div
                  key={share.x}
                  className="rounded-xl border border-[#dbcda9] bg-white p-4 text-sm"
                >
                  <p className="font-semibold">{guardian?.name ?? `Guardião ${index + 1}`}</p>
                  <p className="mt-1 text-[#536074]">
                    Parte {share.x} de {TOTAL}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      downloadShare(
                        guardian?.name ?? `Guardiao-${index + 1}`,
                        share,
                        generated.publicKey,
                        minutes.trim(),
                        generated.inauguratedAt,
                      );
                      setDownloaded((set) => new Set(set).add(index));
                    }}
                    className="mt-3 rounded-lg border border-[#a78648] bg-[#faf7ef] px-4 py-2 font-semibold disabled:opacity-50"
                  >
                    {downloaded.has(index) ? '✓ Baixado — baixar de novo' : 'Baixar esta parte'}
                  </button>
                </div>
              );
            })}
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-[#dbcda9] bg-white p-4 text-sm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1"
            />
            <span>
              Confirmo que as {TOTAL} partes foram baixadas e entregues, cada uma, a um Guardião
              diferente, nesta sessão. Nenhuma cópia ficou neste computador além do necessário para
              o download.
            </span>
          </label>
          <button
            type="button"
            disabled={busy || downloaded.size < TOTAL || !confirmed}
            onClick={confirmInauguration}
            className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? 'Registrando…' : 'Concluir inauguração'}
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 rounded-lg bg-white p-3 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
