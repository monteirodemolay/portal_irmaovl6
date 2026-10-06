'use client';

import { useEffect, useState } from 'react';
import { CeremonyStage, Plaque, useStep } from './ceremony-stage';
import { SealPanel } from '../cripta-administracao/seal-panel';
import { ExportPanel } from '../cripta-administracao/export-panel';
import { PhysicalUnitCheck } from '../cripta-administracao/physical-unit-check';
import type { WizardStep } from '@/modules/cripta/lib/cycle-wizard';

const STEPS = 5; // contexto, lacrar, exportar/pen drives, conferência, concluído

/** Deriva o passo real a partir do mesmo cálculo que já alimenta o histórico e a Administração
 * (computeCycleStatus) — nunca reinventa a condição aqui. Índices 5-8 = Lacração, Exportação,
 * Conferência física, Limpeza; Limpeza em diante já não é assunto do Projetor. */
function stepFromWizard(steps: WizardStep[]): number {
  const current = steps.find((step) => step.status === 'current');
  if (!current) return 4;
  if (current.n <= 5) return 1;
  if (current.n === 6) return 2;
  if (current.n === 7) return 3;
  return 4;
}

type PhysicalCheckEvidence = {
  code: string;
  fingerprint: string;
  size: number;
  totalLetters: number;
  inventoryDigest: string;
  units: string[];
  receiptDigest?: string;
  checkedAt?: string;
  operatorId?: string;
  method?: string;
};
type SealReceipt = {
  code: string;
  letters: number;
  inventoryDigest: string;
  physicalCheck?: PhysicalCheckEvidence | null;
  receiptDigest?: string;
};

export function FechamentoStage({
  wizardSteps,
  sealData,
}: {
  wizardSteps: WizardStep[];
  sealData: SealReceipt | null;
}) {
  const [step, setStep] = useState(() => stepFromWizard(wizardSteps));
  useEffect(() => setStep(() => stepFromWizard(wizardSteps)), [wizardSteps]);

  return (
    <CeremonyStage
      badge="Projetor · Fechamento"
      title="Fechamento e Lacração"
      closingText="Concluída — aguardando autorização para a próxima etapa: Reabertura"
      totalSteps={STEPS}
      step={step}
      setStep={setStep}
    >
      <Body sealData={sealData} />
    </CeremonyStage>
  );
}

function Body({ sealData }: { sealData: SealReceipt | null }) {
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
            <rect x={10} y={20} width={28} height={20} rx={3} />
            <path d="M16 20v-6a8 8 0 0 1 16 0v6" />
          </svg>
          <p className="cripta-eyebrow">Prazo de recebimento vencido</p>
          <h1 className="cripta-headline">Fechamento e Lacração</h1>
          <hr className="cripta-rule" />
          <p className="cripta-lede">
            A partir daqui, nenhuma carta nova entra neste ciclo — o inventário é fechado, lacrado e
            copiado para três unidades físicas externas.
          </p>
        </Plaque>
      )}

      {current === 1 && (
        <Plaque>
          <p className="cripta-step-label">Passo 1 · No Portal</p>
          <p className="cripta-eyebrow">Lacração</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
            Registrar o recibo de lacração
          </h1>
          <div className="cripta-form-shell">
            <SealPanel initiallyOpen={false} step="1 · lacração" />
          </div>
        </Plaque>
      )}

      {current === 2 && sealData && (
        <Plaque>
          <p className="cripta-step-label">Passo 2 · Gravação das unidades físicas</p>
          <p className="cripta-eyebrow">Mesmo arquivo, nas três unidades</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(26px,4vw,40px)' }}>
            Pen drive A · B · C (reserva)
          </h1>
          <div className="cripta-drive-row">
            {['A', 'B', 'C · reserva'].map((label) => (
              <div key={label} className="cripta-drive-item">
                <span className="cripta-drive-icon">
                  <svg
                    viewBox="0 0 24 24"
                    width={24}
                    height={24}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <rect x={7} y={2} width={10} height={20} rx={2} />
                    <path d="M10 2v4M14 2v4" />
                  </svg>
                </span>
                <span style={{ display: 'block', marginTop: 8, fontSize: 13, fontWeight: 700 }}>
                  Unidade {label}
                </span>
              </div>
            ))}
          </div>
          <div className="cripta-form-shell">
            <ExportPanel
              receiptCode={sealData.code}
              totalLetters={sealData.letters}
              inventoryDigest={sealData.inventoryDigest}
            />
          </div>
        </Plaque>
      )}

      {current === 3 && sealData && (
        <Plaque>
          <p className="cripta-step-label">Passo 3 · Conferência</p>
          <p className="cripta-eyebrow">Lendo as três unidades de volta</p>
          <h1 className="cripta-headline" style={{ fontSize: 'clamp(24px,3.6vw,34px)' }}>
            Conferir as três cópias
          </h1>
          <div className="cripta-form-shell">
            <PhysicalUnitCheck
              receiptCode={sealData.code}
              totalLetters={sealData.letters}
              inventoryDigest={sealData.inventoryDigest}
              recorded={
                sealData.physicalCheck?.receiptDigest === sealData.receiptDigest
                  ? sealData.physicalCheck
                  : null
              }
            />
          </div>
        </Plaque>
      )}

      {current === 4 && (
        <Plaque>
          <p className="cripta-step-label">Concluído</p>
          <p className="cripta-eyebrow">Ciclo anual · ato em sessão</p>
          <h1 className="cripta-headline">Fechamento e Lacração</h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginTop: 10,
            }}
          >
            <span
              style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--ink-muted)' }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(20px,2.6vw,28px)',
                fontWeight: 600,
                color: 'var(--ink-muted)',
              }}
            >
              Escrita fechada
            </span>
          </div>
          {sealData && (
            <>
              <p className="cripta-lede" style={{ marginTop: 6 }}>
                {sealData.letters} carta(s) lacrada(s) · três unidades físicas conferidas
              </p>
              <div style={{ marginTop: 28 }}>
                <p className="cripta-step-label">Código do recibo · para a ata</p>
                <p
                  className="cripta-ata-line"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'clamp(20px,3.6vw,32px)',
                    color: 'var(--color-accent-soft)',
                    border: 'none',
                    marginTop: 6,
                    wordBreak: 'break-all',
                  }}
                >
                  {sealData.code}
                </p>
              </div>
            </>
          )}
          <p className="cripta-lede" style={{ marginTop: 20 }}>
            A limpeza dos dados temporários, para quem conduz a manutenção, fica na Administração.
          </p>
        </Plaque>
      )}
    </>
  );
}
