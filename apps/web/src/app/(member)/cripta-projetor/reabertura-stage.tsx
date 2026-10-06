'use client';

import { useEffect, useState } from 'react';
import { CeremonyStage, Plaque, useStep } from './ceremony-stage';
import { OnlineOpeningControl } from '../cripta-administracao/online-opening-control';

type Phase = 'restaurar' | 'reabrir';
const STEPS = 3; // contexto, restauração (aguardando), reabrir

function stepForPhase(phase: Phase): number {
  return phase === 'restaurar' ? 1 : 2;
}

export function ReaberturaStage({
  phase,
  masterName,
  control,
  choices,
  openingDue,
  retainedLetterCount,
}: {
  phase: Phase;
  masterName: string;
  control: { commissionMemberIds?: string[]; nextOpeningDate?: string } | undefined;
  choices: Array<{ id: string; name: string }>;
  openingDue: boolean;
  retainedLetterCount: number;
}) {
  const [step, setStep] = useState(() => stepForPhase(phase));
  useEffect(() => setStep(() => stepForPhase(phase)), [phase]);

  return (
    <CeremonyStage
      badge="Projetor · Reabertura"
      title="Reabertura da Escrita"
      closingText="Em andamento — o próximo Fechamento ocorre quando o prazo de recebimento vencer"
      totalSteps={STEPS}
      step={step}
      setStep={setStep}
    >
      <Body
        masterName={masterName}
        control={control}
        choices={choices}
        openingDue={openingDue}
        retainedLetterCount={retainedLetterCount}
      />
    </CeremonyStage>
  );
}

function Body({
  masterName,
  control,
  choices,
  openingDue,
  retainedLetterCount,
}: {
  masterName: string;
  control: { commissionMemberIds?: string[]; nextOpeningDate?: string } | undefined;
  choices: Array<{ id: string; name: string }>;
  openingDue: boolean;
  retainedLetterCount: number;
}) {
  const current = useStep();
  return (
    <>
      {current === 0 && (
        <Plaque>
          <p className="cripta-step-label">Ato em sessão</p>
          <svg
            className="cripta-emblem"
            viewBox="0 0 48 48"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.3}
          >
            <path d="M24 6v10M24 32v10M6 24h10M32 24h10" />
            <circle cx={24} cy={24} r={11} />
          </svg>
          <p className="cripta-eyebrow">Novo ciclo anual</p>
          <h1 className="cripta-headline">Reabertura da Escrita</h1>
          <hr className="cripta-rule" />
          <p className="cripta-lede">
            O ciclo anterior foi lacrado, gravado em três unidades e conferido. Agora a escrita
            reabre para todo Irmão Ativo — inclusive os que ingressaram depois do último ciclo.
          </p>
        </Plaque>
      )}

      {current === 1 && (
        <Plaque>
          <p className="cripta-step-label">Passo 1 · Na Administração</p>
          <p className="cripta-eyebrow">Agora</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(26px,4vw,40px)' }}>
            Restaurando os rascunhos retidos
          </h1>
          <hr className="cripta-rule" />
          <p className="cripta-lede">
            {retainedLetterCount > 0
              ? `${retainedLetterCount} registro(s) retido(s) do ciclo anterior aguardam restauração.`
              : 'Nenhum registro retido pendente.'}
          </p>
          <span className="cripta-pulse">
            <span />
            <span />
            <span />
          </span>
          <div>
            <button type="button" className="cripta-btn" onClick={() => window.location.reload()}>
              Já restaurei — verificar de novo
            </button>
          </div>
        </Plaque>
      )}

      {current === 2 && (
        <Plaque>
          <p className="cripta-step-label">Passo 2 · Ato em sessão</p>
          <p className="cripta-eyebrow">Agora</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
            Reabrindo o recebimento
          </h1>
          <div className="cripta-form-shell">
            <OnlineOpeningControl
              step="2"
              initiallyOpen={false}
              due={openingDue}
              masterName={masterName}
              commissionMemberIds={control?.commissionMemberIds ?? []}
              nextOpeningDate={control?.nextOpeningDate ?? ''}
              choices={choices}
            />
          </div>
        </Plaque>
      )}
    </>
  );
}
