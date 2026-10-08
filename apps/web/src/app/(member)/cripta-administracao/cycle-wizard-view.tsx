import type { WizardResult } from '@/modules/cripta/lib/cycle-wizard';

/** The single place that answers "onde estamos no ciclo, e qual é o arquivo .lacre certo agora" —
 * rendered at the top of both /lacracao and /reabertura so the two screens never disagree about
 * the current step. Status comes straight from computeCycleStatus, over the same Firestore
 * fields every route in the cycle already reads and writes — nothing here is tracked separately. */
export function CycleWizardView({ result }: { result: WizardResult }) {
  return (
    <section
      className="rounded-2xl border border-[#c9a449] bg-[#fffaf0] p-6"
      aria-label="Onde estamos no ciclo anual"
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
        Onde estamos agora
      </p>
      <h2 className="mt-1 font-serif text-xl text-[#142a43]">{result.phaseLabel}</h2>
      {result.currentFile && (
        <p className="mt-1 text-sm text-[#536074]">
          Arquivo desta rodada:{' '}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono">{result.currentFile}</code>
          {' — '}qualquer outro <code>.lacre</code> é de uma rodada anterior e não deve ser usado
          agora.
        </p>
      )}
      <ol className="mt-4 flex flex-wrap gap-x-1 gap-y-3 text-sm">
        {result.steps.map((step, index) => (
          <li key={step.n} className="flex items-center gap-1">
            <span
              className={
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border font-semibold ' +
                (step.status === 'done'
                  ? 'border-green-700 bg-green-700 text-white'
                  : step.status === 'current'
                    ? 'border-[#123c69] bg-[#123c69] text-white'
                    : 'border-[#c9b98f] bg-white text-[#8a9bb0]')
              }
              aria-hidden="true"
            >
              {step.status === 'done' ? '✓' : step.n}
            </span>
            <span className={step.status === 'pending' ? 'text-[#8a9bb0]' : 'text-[#142a43]'}>
              {step.label}
            </span>
            {index < result.steps.length - 1 && (
              <span className="mx-1 text-[#c9b98f]" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
