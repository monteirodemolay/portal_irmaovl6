'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/** Visual shell for the Projetor — apresentação em tela cheia, "placa por placa", no mesmo
 * estilo do mock-up original (fundo escuro, tipografia de certidão, trilha de passos no topo).
 * Diferente do mock-up, aqui não há navegação livre: cada passo avança sozinho quando a ação
 * real correspondente é confirmada — a trilha e os botões "anterior" só deixam o operador
 * revisar o que já aconteceu nesta sessão. */

type StageContext = {
  step: number;
  total: number;
  advance: () => void;
};

const Ctx = createContext<StageContext | null>(null);

function useStage() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useStage só funciona dentro de <CeremonyStage>.');
  return ctx;
}

export function useAdvance() {
  return useStage().advance;
}

export function useStep() {
  return useStage().step;
}

export function CeremonyStage({
  badge,
  title,
  onceNote,
  closingText,
  totalSteps,
  step,
  setStep,
  children,
}: {
  badge: string;
  title: string;
  onceNote?: string;
  closingText?: string;
  totalSteps: number;
  step: number;
  setStep: (updater: (current: number) => number) => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    function onChange() {
      setFullscreen(document.fullscreenElement === rootRef.current);
    }
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      rootRef.current?.requestFullscreen().catch(() => {});
    }
  }

  const atEnd = step === totalSteps - 1;

  return (
    <Ctx.Provider
      value={{
        step,
        total: totalSteps,
        advance: () => setStep((current) => Math.min(current + 1, totalSteps - 1)),
      }}
    >
      <div ref={rootRef} className="cripta-stage" role="region" aria-label={title}>
        <style>{`
          .cripta-stage {
            --color-primary: #061c36;
            --color-primary-dark: #020a16;
            --color-accent: #d4af37;
            --color-accent-soft: #e9cf7a;
            --ink: #f3f6fa;
            --ink-muted: #8ea2ba;
            --good: #5fd9a0;
            --rule: rgba(212, 175, 55, 0.3);
            --rule-faint: rgba(255, 255, 255, 0.1);
            --font-display: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Georgia, serif;
            --font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --font-mono: ui-monospace, 'SF Mono', 'Cascadia Code', 'Roboto Mono', monospace;
            background: radial-gradient(ellipse at 50% 0%, #0a2342 0%, var(--color-primary-dark) 68%);
            color: var(--ink);
            font-family: var(--font-body);
            border-radius: 1.5rem;
            min-height: 100vh;
            overflow-y: auto;
          }
          .cripta-stage:fullscreen {
            border-radius: 0;
            height: 100vh;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .cripta-chrome { max-width: 980px; margin: 0 auto; padding: 18px 16px 48px; }
          .cripta-tag {
            display: inline-flex; align-items: center; gap: 8px;
            font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
            color: var(--color-accent-soft);
            background: rgba(212, 175, 55, 0.08); border: 1px solid var(--rule);
            border-radius: 999px; padding: 7px 14px;
          }
          .cripta-toprow { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 18px; }
          .cripta-fs-btn {
            appearance: none; border: 1px solid var(--rule-faint); background: rgba(255,255,255,0.04);
            color: var(--ink); font-family: inherit; font-size: 12.5px; font-weight: 700;
            padding: 8px 16px; border-radius: 999px; cursor: pointer;
          }
          .cripta-track { display: flex; justify-content: center; gap: 8px; margin: 4px 0 0; }
          .cripta-track span {
            width: 7px; height: 7px; border-radius: 50%;
            background: var(--rule-faint);
            transition: background 0.25s ease, transform 0.25s ease;
          }
          .cripta-track span.done { background: var(--color-accent); }
          .cripta-track span.now { background: var(--ink); transform: scale(1.4); }
          .cripta-plaque-wrap { min-height: 64vh; display: flex; flex-direction: column; justify-content: center; }
          .cripta-plaque {
            text-align: center;
            padding: clamp(28px, 6vh, 56px) clamp(20px, 6vw, 60px);
            animation: cripta-reveal 0.45s ease both;
          }
          @keyframes cripta-reveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @media (prefers-reduced-motion: reduce) { .cripta-plaque { animation: none; } }
          .cripta-step-label {
            font-size: 11.5px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
            color: var(--ink-muted);
          }
          .cripta-emblem { width: 38px; height: 38px; color: var(--color-accent); opacity: 0.9; margin-bottom: 10px; }
          .cripta-eyebrow {
            margin: 18px 0 0;
            font-size: 12px; font-weight: 700; letter-spacing: 0.26em; text-transform: uppercase;
            color: var(--color-accent-soft);
          }
          .cripta-headline {
            margin: 14px 0 0;
            font-family: var(--font-display); font-weight: 600;
            font-size: clamp(32px, 5.6vw, 58px);
            line-height: 1.1;
            text-wrap: balance;
          }
          .cripta-rule { width: 64px; height: 2px; margin: 24px auto; background: var(--color-accent); border: none; opacity: 0.6; }
          .cripta-lede { max-width: 46ch; margin: 0 auto; color: var(--ink-muted); font-size: clamp(14.5px, 1.6vw, 17px); line-height: 1.65; }
          .cripta-fact { margin-top: 26px; }
          .cripta-fact .value { font-family: var(--font-display); font-weight: 600; font-size: clamp(28px, 4.4vw, 44px); color: var(--ink); }
          .cripta-fact .value.accent { color: var(--color-accent); }
          .cripta-fact .caption { margin-top: 6px; font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ink-muted); }
          .cripta-reveal-list { margin: 24px auto 0; max-width: 420px; display: flex; flex-direction: column; gap: 10px; }
          .cripta-reveal-list .row {
            display: flex; align-items: center; justify-content: space-between;
            font-family: var(--font-display); font-size: clamp(15px, 1.8vw, 18px);
            padding-bottom: 8px; border-bottom: 1px solid var(--rule-faint);
          }
          .cripta-reveal-list .row span:first-child { color: var(--ink-muted); font-family: var(--font-body); font-size: 12.5px; letter-spacing: 0.06em; text-transform: uppercase; }
          .cripta-quorum-dots { display: flex; justify-content: center; gap: 10px; margin-top: 6px; }
          .cripta-quorum-dots span { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--color-accent); transition: background 0.3s ease; }
          .cripta-quorum-dots span.filled { background: var(--color-accent); }
          .cripta-present-grid { margin: 26px auto 0; max-width: 560px; display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; }
          .cripta-chip {
            display: inline-flex; align-items: center; gap: 6px;
            font-size: 13px; padding: 7px 13px;
            border: 1px solid var(--rule-faint); border-radius: 999px;
            color: var(--ink); background: transparent; cursor: pointer; font-family: inherit;
          }
          .cripta-chip.on { border-color: var(--good); color: var(--good); }
          .cripta-draw-stage {
            margin: 30px auto 0; max-width: 480px;
            min-height: 92px;
            display: flex; align-items: center; justify-content: center;
            border: 1px solid var(--rule-faint); border-radius: 16px;
            padding: 18px 24px;
            background: rgba(255,255,255,0.03);
          }
          .cripta-draw-name { font-family: var(--font-display); font-weight: 600; font-size: clamp(24px, 3.6vw, 34px); color: var(--ink-muted); }
          .cripta-draw-name.settled { color: var(--color-accent-soft); }
          .cripta-draw-name.placeholder { color: var(--ink-muted); opacity: 0.45; font-style: italic; font-size: clamp(16px, 2vw, 19px); }
          .cripta-btn {
            appearance: none; border: none; margin-top: 24px;
            background: var(--color-accent); color: #241c05;
            font-family: inherit; font-size: 14.5px; font-weight: 700;
            padding: 12px 26px; border-radius: 999px; cursor: pointer;
          }
          .cripta-btn:disabled { opacity: 0.45; cursor: default; }
          .cripta-confirm-row { display: flex; justify-content: center; gap: 12px; margin-top: 24px; flex-wrap: wrap; }
          .cripta-confirm-btn, .cripta-redraw-btn {
            appearance: none; font-family: inherit; font-size: 13.5px; font-weight: 700;
            padding: 11px 22px; border-radius: 999px; cursor: pointer; border: none;
          }
          .cripta-confirm-btn { background: var(--good); color: #052a1b; }
          .cripta-redraw-btn { border: 1px solid var(--rule-faint); background: transparent; color: var(--ink-muted); }
          .cripta-pulse { display: inline-flex; gap: 5px; margin-top: 18px; }
          .cripta-pulse span { width: 7px; height: 7px; border-radius: 50%; background: var(--color-accent); opacity: 0.35; animation: cripta-pulse 1.2s ease-in-out infinite; }
          .cripta-pulse span:nth-child(2) { animation-delay: 0.2s; }
          .cripta-pulse span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes cripta-pulse { 0%, 100% { opacity: 0.25; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }
          .cripta-nav { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 10px; }
          .cripta-nav button {
            appearance: none; border: 1px solid var(--rule-faint); background: rgba(255,255,255,0.04);
            color: var(--ink); font-family: inherit; font-size: 13px; font-weight: 600;
            padding: 9px 18px; border-radius: 10px; cursor: pointer;
          }
          .cripta-nav button:disabled { opacity: 0.3; cursor: not-allowed; }
          .cripta-once-note {
            text-align: center; margin: 0 0 14px;
            font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
            color: var(--ink-muted);
          }
          .cripta-once-note strong { color: var(--color-accent-soft); }
          .cripta-closing-note {
            display: inline-flex; align-items: center; justify-content: center; gap: 9px;
            font-size: 13.5px; font-weight: 600;
            padding: 11px 20px; border-radius: 999px;
            margin: 0 auto;
            background: rgba(212,175,55,0.12); border: 1px solid var(--rule); color: var(--color-accent-soft);
          }
          .cripta-ata-line { margin-top: 36px; padding-top: 18px; border-top: 1px solid var(--rule-faint); font-size: clamp(13.5px, 1.4vw, 15px); color: var(--ink-muted); }
          .cripta-ata-line strong { color: var(--ink); font-weight: 600; }
          .cripta-drive-row { display: flex; justify-content: center; gap: 22px; margin-top: 30px; flex-wrap: wrap; }
          .cripta-drive-item { text-align: center; }
          .cripta-drive-icon {
            width: 54px; height: 54px; margin: 0 auto;
            border-radius: 10px; border: 2px solid var(--color-accent);
            display: flex; align-items: center; justify-content: center;
            color: var(--color-accent-soft);
          }
          .cripta-form-shell { margin-top: 24px; text-align: left; color: #141413; }
          .cripta-form-shell .rounded-2xl, .cripta-form-shell section { background: #fbf8f1; }
        `}</style>

        <div className="cripta-chrome">
          <div className="cripta-toprow">
            <span className="cripta-tag">
              <svg
                viewBox="0 0 24 24"
                width={13}
                height={13}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M12 2 4 6v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V6l-8-4Z" />
              </svg>
              {badge}
            </span>
            <button type="button" className="cripta-fs-btn" onClick={toggleFullscreen}>
              {fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            </button>
          </div>

          {onceNote && (
            <p className="cripta-once-note">
              <strong>{onceNote}</strong>
            </p>
          )}

          <div className="cripta-track">
            {Array.from({ length: totalSteps }, (_, index) => (
              <span key={index} className={index < step ? 'done' : index === step ? 'now' : ''} />
            ))}
          </div>

          <div className="cripta-plaque-wrap">{children}</div>

          <div className="cripta-nav">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(current - 1, 0))}
            >
              ← Rever passo anterior
            </button>
            <span
              style={{
                fontSize: 12.5,
                color: 'var(--ink-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {step + 1} / {totalSteps}
            </span>
          </div>

          {atEnd && closingText && (
            <p className="cripta-closing-note" style={{ marginTop: 14 }}>
              <svg
                viewBox="0 0 24 24"
                width={15}
                height={15}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span>{closingText}</span>
            </p>
          )}
        </div>
      </div>
    </Ctx.Provider>
  );
}

export function Plaque({ children }: { children: ReactNode }) {
  return <div className="cripta-plaque">{children}</div>;
}
