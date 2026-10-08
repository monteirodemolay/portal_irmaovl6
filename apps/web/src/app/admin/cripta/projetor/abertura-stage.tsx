'use client';

import { useEffect, useState } from 'react';
import { CeremonyStage, Plaque, useStep } from './ceremony-stage';
import { ComissaoForm } from '../comissao-form';
import { OnlineOpeningControl } from '../online-opening-control';

type Phase = 'comissao' | 'abrir' | 'aberto';
type Member = { id: string; nomeCompleto: string };
type Control =
  { commissionMemberIds?: string[]; nextOpeningDate?: string; minutes?: string } | undefined;

const STEPS = 4; // contexto, comissão, abrir, concluído/acompanhamento

function stepForPhase(phase: Phase): number {
  if (phase === 'comissao') return 1;
  if (phase === 'abrir') return 2;
  return 3;
}

export function AberturaStage({
  phase,
  masterName,
  masterMissing,
  eligible,
  control,
  choices,
  openingDue,
  wrote,
  total,
}: {
  phase: Phase;
  masterName: string;
  masterMissing: boolean;
  eligible: Member[];
  control: Control;
  choices: Array<{ id: string; name: string }>;
  openingDue: boolean;
  wrote: number;
  total: number;
}) {
  const [step, setStep] = useState(() => stepForPhase(phase));
  useEffect(() => setStep(() => stepForPhase(phase)), [phase]);

  return (
    <CeremonyStage
      badge="Projetor · Abertura"
      title="Abertura da Escrita"
      closingText="Em andamento — o Fechamento ocorre quando o prazo de recebimento vencer"
      totalSteps={STEPS}
      step={step}
      setStep={setStep}
    >
      <Body
        masterName={masterName}
        masterMissing={masterMissing}
        eligible={eligible}
        control={control}
        choices={choices}
        openingDue={openingDue}
        wrote={wrote}
        total={total}
      />
    </CeremonyStage>
  );
}

function Body({
  masterName,
  masterMissing,
  eligible,
  control,
  choices,
  openingDue,
  wrote,
  total,
}: {
  masterName: string;
  masterMissing: boolean;
  eligible: Member[];
  control: Control;
  choices: Array<{ id: string; name: string }>;
  openingDue: boolean;
  wrote: number;
  total: number;
}) {
  const current = useStep();
  return (
    <>
      {current === 0 && (
        <Plaque>
          <p className="cripta-step-label">Ciclo anual</p>
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
          <p className="cripta-eyebrow">Ato em sessão</p>
          <h1 className="cripta-headline">Abertura da Escrita</h1>
          <hr className="cripta-rule" />
          <div className="cripta-fact">
            <p className="value">{masterName || 'Venerável não identificado'}</p>
            <p className="caption">Venerável Mestre, preside o ato</p>
          </div>
        </Plaque>
      )}

      {current === 1 && (
        <Plaque>
          <p className="cripta-step-label">Passo 1 · Deliberação em Loja</p>
          <p className="cripta-eyebrow">Comissão de Guarda</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
            Nomear quem guarda a Cripta
          </h1>
          <div className="cripta-form-shell">
            <ComissaoForm
              eligible={eligible}
              masterName={masterName}
              masterMissing={masterMissing}
              control={control}
              prominent
            />
          </div>
          <p className="cripta-lede" style={{ marginTop: 20 }}>
            Depois de nomear, clique abaixo para seguir para a Abertura.
          </p>
          <button type="button" className="cripta-btn" onClick={() => window.location.reload()}>
            Já nomeei — continuar →
          </button>
        </Plaque>
      )}

      {current === 2 && (
        <Plaque>
          <p className="cripta-step-label">Passo 2 · Ato em sessão</p>
          <p className="cripta-eyebrow">Agora</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
            Abrindo o recebimento
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

      {current === 3 && (
        <Plaque>
          <p className="cripta-step-label">Concluído</p>
          <p className="cripta-eyebrow">Ciclo anual · ato em sessão</p>
          <h1 className="cripta-headline">Abertura da Escrita</h1>
          <div
            className="status-line"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginTop: 10,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: 'var(--good)',
                boxShadow: '0 0 0 6px rgba(95,217,160,0.16)',
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(20px,2.6vw,28px)',
                fontWeight: 600,
                color: 'var(--good)',
              }}
            >
              Escrita aberta
            </span>
          </div>
          <div className="cripta-fact">
            <p className="value accent">{wrote}</p>
            <p className="caption">de {total} Irmãos Ativos já escreveram sua carta</p>
          </div>
          <p className="cripta-lede" style={{ marginTop: 20 }}>
            O acompanhamento nome a nome, e o fechamento quando o prazo vencer, ficam na
            Administração.
          </p>
        </Plaque>
      )}
    </>
  );
}
