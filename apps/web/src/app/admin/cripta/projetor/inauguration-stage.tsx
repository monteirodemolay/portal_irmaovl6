'use client';
import { guardianShareDigest } from '@/modules/cripta/lib/guardian-file-check';

import { useRef, useState, type ReactNode } from 'react';
import { generateCriptaKeypair, type CriptaPublicKey } from '@/modules/cripta/lib/cripta-key';
import { splitSecret, type Share } from '@/modules/cripta/lib/shamir';
import { CeremonyStage, Plaque, useAdvance, useStep } from './ceremony-stage';

type Member = { id: string; name: string };

const TOTAL = 5;
const THRESHOLD = 3;
const STEPS =
  2 /* presidência, presentes */ +
  TOTAL /* sorteio ao vivo, um por Guardião */ +
  1 /* resumo */ +
  2 /* gerar, dividir */ +
  1 /* entrega */ +
  1; /* concluído */

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

export function InaugurationStage({
  eligible,
  masterName,
}: {
  eligible: Member[];
  masterName: string;
}) {
  const [step, setStep] = useState(0);
  return (
    <CeremonyStage
      badge="Projetor · Inauguração"
      title="Inauguração da Cripta"
      onceNote="Ato único · ocorre uma única vez na vida da Cripta"
      closingText="Concluída — aguardando autorização para a próxima etapa: Abertura da Escrita"
      totalSteps={STEPS}
      step={step}
      setStep={setStep}
    >
      <Body eligible={eligible} masterName={masterName} />
    </CeremonyStage>
  );
}

function Body({ eligible, masterName }: { eligible: Member[]; masterName: string }) {
  const advance = useAdvance();
  const [presentIds, setPresentIds] = useState<string[]>([]);
  const [minutes, setMinutes] = useState('');
  const [drawResult, setDrawResult] = useState<{ guardianMemberIds: string[] } | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawError, setDrawError] = useState('');
  const [revealIndex, setRevealIndex] = useState(0);
  const [revealedNames, setRevealedNames] = useState<string[]>([]);
  const [spinningName, setSpinningName] = useState('');
  const [settled, setSettled] = useState(false);
  const [generated, setGenerated] = useState<{
    publicKey: CriptaPublicKey;
    shares: Share[];
    inauguratedAt: string;
  } | null>(null);
  const [genBusy, setGenBusy] = useState(false);
  const [downloaded, setDownloaded] = useState<Set<number>>(new Set());
  const [confirmed, setConfirmed] = useState(false);
  const [finishBusy, setFinishBusy] = useState(false);
  const [message, setMessage] = useState('');
  const spinTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const nameOf = (id: string) => eligible.find((member) => member.id === id)?.name ?? id;

  async function draw(redraw: boolean) {
    setDrawing(true);
    setDrawError('');
    try {
      const response = await fetch('/api/cripta/ceremony-draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presentMemberIds: presentIds, redraw }),
      });
      const data = (await response.json()) as {
        result?: { guardianMemberIds: string[] };
        error?: string;
      };
      if (!response.ok || !data.result) throw new Error(data.error ?? 'Sorteio não confirmado.');
      setDrawResult(data.result);
      setRevealIndex(0);
      setRevealedNames([]);
      setSettled(false);
      advance(); // sai de "Presentes" para o primeiro passo de sorteio ao vivo
    } catch (error) {
      setDrawError(error instanceof Error ? error.message : 'Não foi possível sortear.');
    } finally {
      setDrawing(false);
    }
  }

  /** Giro ao vivo entre os presentes ainda não confirmados — igual a um Peão do Baú: o nome
   * exibido muda rapidamente, mas quem decide quem é sorteado já foi o servidor, com
   * node:crypto, no momento do sorteio. O giro é só a revelação visual, nunca a decisão. */
  function spin() {
    if (!drawResult) return;
    const remainingPool = presentIds.filter((id) => !revealedNames.includes(nameOf(id)));
    if (remainingPool.length === 0) return;
    setSettled(false);
    let ticks = 0;
    const maxTicks = 16;
    spinTimer.current = setInterval(() => {
      const randomId = remainingPool[Math.floor(Math.random() * remainingPool.length)]!;
      setSpinningName(nameOf(randomId));
      ticks += 1;
      if (ticks >= maxTicks) {
        if (spinTimer.current) clearInterval(spinTimer.current);
        const real = nameOf(drawResult.guardianMemberIds[revealIndex]!);
        setSpinningName(real);
        setSettled(true);
      }
    }, 70);
  }

  function confirmReveal() {
    if (!drawResult) return;
    setRevealedNames((names) => [...names, nameOf(drawResult.guardianMemberIds[revealIndex]!)]);
    setSpinningName('');
    setSettled(false);
    setRevealIndex((index) => index + 1);
    advance();
  }

  async function generate() {
    setGenBusy(true);
    setMessage('');
    try {
      const { publicKey, privateScalar } = await generateCriptaKeypair();
      const shares = splitSecret(privateScalar, TOTAL, THRESHOLD);
      privateScalar.fill(0);
      setGenerated({ publicKey, shares, inauguratedAt: new Date().toISOString() });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gerar a chave.');
    } finally {
      setGenBusy(false);
      advance();
    }
  }

  async function confirmInauguration() {
    if (!generated || !drawResult) return;
    setFinishBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/cripta/inauguration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardianShareDigests: await Promise.all(
            generated.shares.map((share) =>
              guardianShareDigest(share, generated.publicKey, TOTAL, THRESHOLD),
            ),
          ),
          publicKey: generated.publicKey,
          totalGuardians: TOTAL,
          threshold: THRESHOLD,
          guardianMemberIds: drawResult.guardianMemberIds,
          minutes: minutes.trim(),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'Inauguração não confirmada.');
      advance();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Inauguração não confirmada.');
    } finally {
      setFinishBusy(false);
    }
  }

  return (
    <>
      <StepPresidencia masterName={masterName} onContinue={advance} />
      <StepPresentes
        eligible={eligible}
        presentIds={presentIds}
        setPresentIds={setPresentIds}
        minutes={minutes}
        setMinutes={setMinutes}
        drawing={drawing}
        drawError={drawError}
        onDraw={() => draw(false)}
      />
      {Array.from({ length: TOTAL }, (_, index) => (
        <StepSorteio
          key={index}
          index={index}
          revealIndex={revealIndex}
          spinningName={spinningName}
          settled={settled}
          remaining={presentIds.length - revealedNames.length}
          onSpin={spin}
          onConfirm={confirmReveal}
          onRedraw={() => draw(true)}
          drawing={drawing}
        />
      ))}
      <StepResumo revealedNames={revealedNames} onContinue={advance} />
      <StepGerando busy={genBusy} onStart={generate} />
      <StepDividindo onContinue={advance} />
      <StepEntrega
        shares={generated?.shares ?? []}
        drawResult={drawResult}
        nameOf={nameOf}
        publicKey={generated?.publicKey}
        minutes={minutes}
        inauguratedAt={generated?.inauguratedAt ?? ''}
        downloaded={downloaded}
        setDownloaded={setDownloaded}
        confirmed={confirmed}
        setConfirmed={setConfirmed}
        busy={finishBusy}
        message={message}
        onConfirm={confirmInauguration}
      />
      <StepConcluido masterName={masterName} minutes={minutes} />
    </>
  );
}

function StepPresidencia({
  masterName,
  onContinue,
}: {
  masterName: string;
  onContinue: () => void;
}) {
  return (
    <AtStepByIndex index={0}>
      <p className="cripta-step-label">Passo 1 · Presidência</p>
      <svg
        className="cripta-emblem"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
      >
        <circle cx={24} cy={24} r={21} />
        <path d="M24 8 L36 30 H12 Z" />
      </svg>
      <p className="cripta-eyebrow">Sessão fechada</p>
      <h1 className="cripta-headline">Inauguração da Cripta Digital</h1>
      <hr className="cripta-rule" />
      <div className="cripta-fact">
        <p className="value">{masterName || 'Venerável não identificado'}</p>
        <p className="caption">Venerável Mestre, preside o ato</p>
      </div>
      <button type="button" className="cripta-btn" onClick={onContinue} disabled={!masterName}>
        Continuar →
      </button>
    </AtStepByIndex>
  );
}

function StepPresentes({
  eligible,
  presentIds,
  setPresentIds,
  minutes,
  setMinutes,
  drawing,
  drawError,
  onDraw,
}: {
  eligible: Member[];
  presentIds: string[];
  setPresentIds: (updater: (ids: string[]) => string[]) => void;
  minutes: string;
  setMinutes: (value: string) => void;
  drawing: boolean;
  drawError: string;
  onDraw: () => void;
}) {
  return (
    <AtStepByIndex index={1}>
      <p className="cripta-step-label">Passo 2 · Antes do sorteio</p>
      <p className="cripta-eyebrow">Conferência de quórum</p>
      <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
        Irmãos Ativos presentes
      </h1>
      <div className="cripta-present-grid">
        {eligible.map((member) => {
          const on = presentIds.includes(member.id);
          return (
            <button
              key={member.id}
              type="button"
              className={`cripta-chip ${on ? 'on' : ''}`}
              onClick={() =>
                setPresentIds((ids) =>
                  ids.includes(member.id)
                    ? ids.filter((id) => id !== member.id)
                    : [...ids, member.id],
                )
              }
            >
              {on && (
                <svg
                  viewBox="0 0 24 24"
                  width={12}
                  height={12}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
              {member.name}
            </button>
          );
        })}
      </div>
      <p style={{ marginTop: 18, fontSize: 13, color: 'var(--ink-muted)' }}>
        <strong style={{ color: 'var(--ink)' }}>{presentIds.length}</strong> presentes de{' '}
        {eligible.length} Irmãos Ativos elegíveis
      </p>
      <input
        value={minutes}
        onChange={(event) => setMinutes(event.target.value)}
        placeholder="Ata da sessão (ex.: Ata 130/2026)"
        maxLength={160}
        style={{
          marginTop: 20,
          width: '100%',
          maxWidth: 360,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--rule-faint)',
          borderRadius: 12,
          color: 'var(--ink)',
          padding: '10px 16px',
          fontFamily: 'inherit',
          fontSize: 14,
        }}
      />
      <div>
        <button
          type="button"
          className="cripta-btn"
          disabled={drawing || presentIds.length < TOTAL || minutes.trim().length < 5}
          onClick={onDraw}
        >
          {drawing ? 'Sorteando…' : 'Sortear os Guardiões'}
        </button>
      </div>
      {presentIds.length < TOTAL && (
        <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--ink-muted)' }}>
          Marque ao menos {TOTAL} presentes para sortear.
        </p>
      )}
      {drawError && <p style={{ marginTop: 10, fontSize: 13, color: '#f7a0a0' }}>{drawError}</p>}
    </AtStepByIndex>
  );
}

function StepSorteio({
  index,
  revealIndex,
  spinningName,
  settled,
  remaining,
  onSpin,
  onConfirm,
  onRedraw,
  drawing,
}: {
  index: number;
  revealIndex: number;
  spinningName: string;
  settled: boolean;
  remaining: number;
  onSpin: () => void;
  onConfirm: () => void;
  onRedraw: () => void;
  drawing: boolean;
}) {
  const stepN = 2 + index;
  const isCurrent = revealIndex === index;
  return (
    <AtStepByIndex index={stepN}>
      <p className="cripta-step-label">Passo {stepN + 1} · Sorteio ao vivo</p>
      <p className="cripta-eyebrow">Entre os presentes {index > 0 ? 'restantes' : ''}</p>
      <h1 className="cripta-headline">Guardião {index + 1}</h1>
      <div className="cripta-draw-stage">
        <span
          className={`cripta-draw-name ${settled && isCurrent ? 'settled' : ''} ${!spinningName ? 'placeholder' : ''}`}
        >
          {isCurrent ? spinningName || 'Aguardando sorteio…' : '—'}
        </span>
      </div>
      {isCurrent && !settled && (
        <button type="button" className="cripta-btn" onClick={onSpin}>
          Sortear o Guardião {index + 1}
        </button>
      )}
      {isCurrent && settled && (
        <div className="cripta-confirm-row">
          <button type="button" className="cripta-confirm-btn" onClick={onConfirm}>
            ✓ Confirmar
          </button>
          <button type="button" className="cripta-redraw-btn" disabled={drawing} onClick={onRedraw}>
            ↻ Sortear tudo de novo
          </button>
        </div>
      )}
      <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--ink-muted)' }}>
        <strong style={{ color: 'var(--ink)' }}>{remaining}</strong> Irmãos elegíveis na urna
      </p>
    </AtStepByIndex>
  );
}

function StepResumo({
  revealedNames,
  onContinue,
}: {
  revealedNames: string[];
  onContinue: () => void;
}) {
  return (
    <AtStepByIndex index={2 + TOTAL}>
      <p className="cripta-step-label">Sorteio concluído</p>
      <p className="cripta-eyebrow">Comissão de Guardiões</p>
      <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
        Sorteados, nesta ordem
      </h1>
      <div className="cripta-reveal-list">
        {Array.from({ length: TOTAL }, (_, index) => (
          <div key={index} className="row">
            <span>Guardião {index + 1}</span>
            <span>{revealedNames[index] ?? '—'}</span>
          </div>
        ))}
      </div>
      <button type="button" className="cripta-btn" onClick={onContinue}>
        Continuar →
      </button>
    </AtStepByIndex>
  );
}

function StepGerando({ busy, onStart }: { busy: boolean; onStart: () => void }) {
  return (
    <AtStepByIndex index={3 + TOTAL}>
      <p className="cripta-step-label">No navegador do Venerável</p>
      <p className="cripta-eyebrow">Agora</p>
      <h1 className="cripta-headline">Gerando a chave da Cripta</h1>
      <hr className="cripta-rule" />
      <p className="cripta-lede">
        A chave é criada neste instante, dentro do navegador — nunca passa pelos servidores do
        Portal.
      </p>
      {busy ? (
        <span className="cripta-pulse">
          <span />
          <span />
          <span />
        </span>
      ) : (
        <button type="button" className="cripta-btn" onClick={onStart}>
          Gerar a chave agora
        </button>
      )}
    </AtStepByIndex>
  );
}

function StepDividindo({ onContinue }: { onContinue: () => void }) {
  return (
    <AtStepByIndex index={4 + TOTAL}>
      <p className="cripta-step-label">No navegador do Venerável</p>
      <p className="cripta-eyebrow">Agora</p>
      <h1 className="cripta-headline">Dividindo a chave em {TOTAL} partes</h1>
      <hr className="cripta-rule" />
      <p className="cripta-lede">
        Cada um dos {TOTAL} Guardiões sorteados recebe a sua — nenhuma sozinha abre coisa alguma.
      </p>
      <button type="button" className="cripta-btn" onClick={onContinue}>
        Continuar para a entrega →
      </button>
    </AtStepByIndex>
  );
}

function StepEntrega({
  shares,
  drawResult,
  nameOf,
  publicKey,
  minutes,
  inauguratedAt,
  downloaded,
  setDownloaded,
  confirmed,
  setConfirmed,
  busy,
  message,
  onConfirm,
}: {
  shares: Share[];
  drawResult: { guardianMemberIds: string[] } | null;
  nameOf: (id: string) => string;
  publicKey: CriptaPublicKey | undefined;
  minutes: string;
  inauguratedAt: string;
  downloaded: Set<number>;
  setDownloaded: (updater: (set: Set<number>) => Set<number>) => void;
  confirmed: boolean;
  setConfirmed: (value: boolean) => void;
  busy: boolean;
  message: string;
  onConfirm: () => void;
}) {
  return (
    <AtStepByIndex index={5 + TOTAL}>
      <p className="cripta-step-label">Nesta mesma sessão</p>
      <p className="cripta-eyebrow">Entrega física</p>
      <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
        Entregue cada parte, agora
      </h1>
      <div className="cripta-form-shell">
        <p className="rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Faça isto agora, nesta sala, antes de continuar.</strong> Baixe cada parte e
          entregue fisicamente ao respectivo Guardião — nunca por e-mail, nunca fotografada, nunca
          as {TOTAL} juntas no mesmo aparelho depois deste momento.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {shares.map((share, index) => {
            const guardianId = drawResult?.guardianMemberIds[index];
            const guardianName = guardianId ? nameOf(guardianId) : `Guardião ${index + 1}`;
            return (
              <div
                key={share.x}
                className="rounded-xl border border-[#dbcda9] bg-white p-4 text-sm"
              >
                <p className="font-semibold">{guardianName}</p>
                <p className="mt-1 text-[#536074]">
                  Parte {share.x} de {TOTAL}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (!publicKey) return;
                    downloadShare(guardianName, share, publicKey, minutes.trim(), inauguratedAt);
                    setDownloaded((set) => new Set(set).add(index));
                  }}
                  className="mt-3 rounded-lg border border-[#a78648] bg-[#faf7ef] px-4 py-2 font-semibold"
                >
                  {downloaded.has(index) ? '✓ Baixado — baixar de novo' : 'Baixar esta parte'}
                </button>
              </div>
            );
          })}
        </div>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-[#dbcda9] bg-white p-4 text-sm">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-1"
          />
          <span>
            Confirmo que as {TOTAL} partes foram baixadas e entregues, cada uma, a um Guardião
            diferente, nesta sessão.
          </span>
        </label>
        <button
          type="button"
          disabled={busy || downloaded.size < TOTAL || !confirmed}
          onClick={onConfirm}
          className="mt-4 rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Registrando…' : 'Concluir inauguração'}
        </button>
        {message && <p className="mt-3 rounded-lg bg-white p-3 text-sm">{message}</p>}
      </div>
    </AtStepByIndex>
  );
}

function StepConcluido({ masterName, minutes }: { masterName: string; minutes: string }) {
  return (
    <AtStepByIndex index={6 + TOTAL}>
      <svg
        className="cripta-emblem"
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.3}
      >
        <circle cx={24} cy={24} r={21} />
        <path d="M24 8 L36 30 H12 Z" />
      </svg>
      <p className="cripta-eyebrow">Cripta inaugurada</p>
      <h1 className="cripta-headline">Chave gerada e repartida</h1>
      <hr className="cripta-rule" />
      <div className="cripta-quorum-dots">
        {Array.from({ length: TOTAL }, (_, index) => (
          <span key={index} className={index < THRESHOLD ? 'filled' : ''} />
        ))}
      </div>
      <p className="cripta-lede" style={{ marginTop: 14 }}>
        {THRESHOLD} de {TOTAL} Guardiões, reunidos, para abrir qualquer carta.
      </p>
      <p className="cripta-ata-line">
        Presidência: <strong>{masterName}</strong>, Venerável Mestre
        {minutes && (
          <>
            {' '}
            · Ata <strong>{minutes}</strong>
          </>
        )}
      </p>
    </AtStepByIndex>
  );
}

function AtStepByIndex({ index, children }: { index: number; children: ReactNode }) {
  const current = useStep();
  if (current !== index) return null;
  return <Plaque>{children}</Plaque>;
}
