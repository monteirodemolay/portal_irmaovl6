import { BRAZIL_TIME_ZONE } from '@vl6/shared';
import { cn } from '@vl6/ui';
import type { ArchiveMediaCounts } from '@vl6/domain';

export const WIZARD_STEPS = [
  { key: 'evento', label: 'Evento' },
  { key: 'arquivos', label: 'Arquivos' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'organizacao', label: 'Organização' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'publicacao', label: 'Publicação' },
] as const;

export type PublishWizardStep = (typeof WIZARD_STEPS)[number]['key'];

/**
 * Régua de passos do wizard — círculos numerados com estado concluído
 * (✓ preenchido) e atual (anel em destaque), ligados por uma linha, no
 * mesmo espírito do mock-up aprovado pelo Administrador. Cada passo já
 * percorrido é clicável (não avança, só volta — a mesma regra que o
 * wizard antigo já seguia entre "Evento"/"Enviar"/"Organizar").
 */
export function WizardStepper({
  current,
  onNavigate,
}: {
  current: PublishWizardStep;
  onNavigate: (step: PublishWizardStep) => void;
}) {
  const currentIndex = WIZARD_STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="border-border bg-surface flex items-center justify-between rounded-xl border p-4">
      {WIZARD_STEPS.map((step, index) => {
        const isDone = index < currentIndex;
        const isCurrent = step.key === current;
        return (
          <li key={step.key} className="relative flex flex-1 flex-col items-center gap-1.5">
            {index > 0 && (
              <span
                className={cn(
                  'absolute right-1/2 top-4 h-px w-full',
                  isDone ? 'bg-accent' : 'bg-border',
                )}
              />
            )}
            <button
              type="button"
              disabled={!isDone && !isCurrent}
              onClick={() => onNavigate(step.key)}
              className={cn(
                'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-semibold',
                isDone && 'bg-accent border-accent text-primary-dark',
                isCurrent && 'border-primary text-primary bg-surface ring-primary/15 ring-4',
                !isDone && !isCurrent && 'border-border text-muted bg-surface',
              )}
            >
              {isDone ? '✓' : index + 1}
            </button>
            <span
              className={cn(
                'text-center text-[11px] font-medium',
                isCurrent ? 'text-primary' : 'text-muted',
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Título numerado de cada painel — mesmo padrão visual em todos os passos. */
export function StepTitle({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="bg-accent/15 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">
        {n}
      </span>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-muted text-sm">{text}</p>
      </div>
    </div>
  );
}

/** Faixa com o Evento selecionado — fica no topo de todo passo a partir de "Arquivos". */
export function EventContextBar({
  title,
  date,
  local,
  onChangeEvent,
  changeLabel = 'Trocar evento',
}: {
  title: string;
  date: Date;
  local: string;
  onChangeEvent: () => void;
  /** Rótulo do botão à direita — só o passo "Arquivos" volta de fato pra
   * seleção de Evento; nos passos seguintes o botão só volta um passo, não
   * troca o Evento, então o rótulo precisa deixar isso claro. */
  changeLabel?: string;
}) {
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  const [day, month] = dateLabel.split(' ');
  return (
    <div className="from-primary to-primary-dark flex items-center gap-4 rounded-t-xl bg-gradient-to-r px-5 py-3.5 text-white">
      <span className="text-primary flex h-11 w-11 flex-col items-center justify-center rounded-lg bg-white text-xs font-extrabold">
        {day}
        <small className="text-[9px] font-semibold">{month}</small>
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[9px] uppercase tracking-wide text-white/60">Evento selecionado</span>
        <strong className="truncate text-sm">{title}</strong>
        <p className="truncate text-xs text-white/70">
          {new Intl.DateTimeFormat('pt-BR', {
            dateStyle: 'short',
            timeZone: BRAZIL_TIME_ZONE,
          }).format(date)}{' '}
          · {local}
        </p>
      </div>
      <button
        type="button"
        onClick={onChangeEvent}
        className="shrink-0 rounded-full border border-white/25 px-3 py-1 text-xs font-medium hover:bg-white/10"
      >
        {changeLabel}
      </button>
    </div>
  );
}

const MEDIA_STAT_ICON: Record<keyof ArchiveMediaCounts, { label: string; className: string }> = {
  foto: { label: 'Fotografias', className: 'bg-blue-50 text-blue-600' },
  video: { label: 'Vídeos', className: 'bg-purple-50 text-purple-600' },
  documento: { label: 'Documentos', className: 'bg-red-50 text-red-600' },
  audio: { label: 'Áudios', className: 'bg-amber-50 text-amber-700' },
};

/** Faixa com a contagem por tipo de mídia — reaparece em Arquivos, Classificação e Revisão. */
export function MediaStatsRow({ counts }: { counts: ArchiveMediaCounts }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {(Object.keys(MEDIA_STAT_ICON) as (keyof ArchiveMediaCounts)[]).map((type) => (
        <div key={type} className="border-border flex items-center gap-3 rounded-lg border p-3">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold',
              MEDIA_STAT_ICON[type].className,
            )}
          >
            {counts[type]}
          </span>
          <span className="text-muted text-xs">{MEDIA_STAT_ICON[type].label}</span>
        </div>
      ))}
    </div>
  );
}
