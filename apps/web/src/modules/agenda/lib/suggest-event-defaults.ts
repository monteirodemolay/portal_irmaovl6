/** Minúsculas sem acento, preservando os espaços (diferente de `normalizeForSearch`). */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/** Subconjunto serializável de um acontecimento já cadastrado. */
export interface EventTemplate {
  id: string;
  tipo: string;
  titulo: string;
  /** ISO. */
  dataInicio: string;
  local: string;
  traje: string | null;
  chegadaSugerida: string | null;
  capacidadeMaxima: number | null;
  exigeConfirmacaoPresenca: boolean;
}

export interface EventDefaults {
  local?: string;
  traje?: string;
  chegadaSugerida?: string;
  capacidadeMaxima?: number;
  exigeConfirmacaoPresenca?: boolean;
}

export interface EventSuggestion {
  source: Pick<EventTemplate, 'id' | 'titulo' | 'dataInicio'>;
  /** Por que este foi escolhido, em linguagem de tela. */
  reason: string;
  defaults: EventDefaults;
}

/** Tipos sem rotina repetível: nunca sugerem nem recebem sugestão. */
const NO_SUGGESTION = new Set(['recesso', 'aniversario']);
const MIN_TITLE = 3;

function tokens(title: string): Set<string> {
  return new Set(
    fold(title)
      .replace(/\d+/g, ' ')
      .split(/[^a-z]+/)
      .filter((word) => word.length > 2),
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const word of a) if (b.has(word)) shared++;
  return shared / (a.size + b.size - shared);
}

function defaultsOf(template: EventTemplate): EventDefaults {
  const out: EventDefaults = {};
  if (template.local.trim()) out.local = template.local.trim();
  if (template.traje?.trim()) out.traje = template.traje.trim();
  if (template.chegadaSugerida?.trim()) out.chegadaSugerida = template.chegadaSugerida.trim();
  if (template.capacidadeMaxima) out.capacidadeMaxima = template.capacidadeMaxima;
  if (template.exigeConfirmacaoPresenca) out.exigeConfirmacaoPresenca = true;
  return out;
}

/**
 * Sugere o preenchimento de local, traje, chegada e presença a partir do
 * acontecimento anterior mais parecido. Nunca inventa: só repete dados que já
 * existem em um registro real, e quem decide é o Administrador.
 *
 * Ordem: mesmo título (sem números) > títulos parecidos do mesmo tipo >
 * último do mesmo tipo (quando ainda não há título).
 */
export function suggestEventDefaults(
  templates: EventTemplate[],
  input: { tipo: string; titulo: string },
): EventSuggestion | null {
  if (!input.tipo || NO_SUGGESTION.has(input.tipo)) return null;
  const title = input.titulo.trim();
  const typed = title.length >= MIN_TITLE;
  const wanted = tokens(title);
  const exact = fold(title).replace(/\d+/g, '').replace(/\s+/g, ' ').trim();

  let best: { score: number; time: number; template: EventTemplate; reason: string } | null = null;
  for (const template of templates) {
    if (NO_SUGGESTION.has(template.tipo)) continue;
    const defaults = defaultsOf(template);
    if (Object.keys(defaults).length === 0) continue;
    const sameType = template.tipo === input.tipo;
    const time = Date.parse(template.dataInicio);
    if (!Number.isFinite(time)) continue;

    let score = 0;
    let reason = '';
    if (typed) {
      const candidate = fold(template.titulo).replace(/\d+/g, '').replace(/\s+/g, ' ').trim();
      if (candidate && candidate === exact) {
        score = sameType ? 4 : 3;
        reason = 'mesmo título';
      } else if (sameType && overlap(wanted, tokens(template.titulo)) >= 0.5) {
        score = 2;
        reason = 'título parecido';
      }
    }
    if (score === 0 && sameType && !typed) {
      score = 1;
      reason = 'último do mesmo tipo';
    }
    if (score === 0) continue;
    if (!best || score > best.score || (score === best.score && time > best.time)) {
      best = { score, time, template, reason };
    }
  }
  if (!best) return null;
  return {
    source: {
      id: best.template.id,
      titulo: best.template.titulo,
      dataInicio: best.template.dataInicio,
    },
    reason: best.reason,
    defaults: defaultsOf(best.template),
  };
}

export const DEFAULT_LABELS: Record<keyof EventDefaults, string> = {
  local: 'local',
  traje: 'traje',
  chegadaSugerida: 'chegada sugerida',
  capacidadeMaxima: 'capacidade',
  exigeConfirmacaoPresenca: 'confirmação de presença',
};
