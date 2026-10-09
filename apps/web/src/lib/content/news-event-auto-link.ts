import type { Event } from '@vl6/domain';

export type NewsEventMatchCandidate = Pick<Event, 'id' | 'titulo' | 'dataInicio' | 'deletedAt'>;

const IGNORED_WORDS = new Set([
  'a', 'as', 'o', 'os', 'de', 'da', 'das', 'do', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'uma', 'um', 'que', 'se', 'ao', 'aos', 'sua', 'seu', 'suas', 'seus',
  'verdadeira', 'luz', 'loja', 'maconica', 'masonica', 'nº', '06', 'realiza', 'realizam',
  'promove', 'promovem', 'recebe', 'celebra', 'reforca', 'marca', 'marcada', 'marcado',
]);

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((word) => word.length > 2 && !IGNORED_WORDS.has(word));
}

export interface NewsEventMatch {
  event: NewsEventMatchCandidate;
  score: number;
  sharedWords: string[];
  distanceDays: number;
}

export function scoreNewsEventMatch(
  title: string,
  publicationDate: Date,
  event: NewsEventMatchCandidate,
): NewsEventMatch | null {
  if (event.deletedAt) return null;
  const eventTime = event.dataInicio.getTime();
  const publicationTime = publicationDate.getTime();
  if (!Number.isFinite(eventTime) || !Number.isFinite(publicationTime)) return null;

  const distanceDays = Math.abs(eventTime - publicationTime) / 86_400_000;
  if (distanceDays > 7) return null;

  const newsWords = new Set(words(title));
  const eventWords = [...new Set(words(event.titulo))];
  const sharedWords = eventWords.filter((word) => newsWords.has(word));
  const normalizedNews = normalize(title);
  const normalizedEvent = normalize(event.titulo);
  const phraseContained =
    normalizedEvent.length >= 7 &&
    (normalizedNews.includes(normalizedEvent) || normalizedEvent.includes(normalizedNews));

  // Uma palavra genérica e uma data próxima não são suficientes para alterar dados sozinho.
  if (sharedWords.length < 2 && !phraseContained) return null;

  const dateScore =
    distanceDays <= 0.75 ? 90 : distanceDays <= 1.5 ? 80 : distanceDays <= 3 ? 60 : 35;
  const wordScore = sharedWords.reduce((total, word) => total + (word.length >= 6 ? 38 : 30), 0);
  const phraseScore = phraseContained ? 55 : 0;
  const coverage = eventWords.length > 0 ? sharedWords.length / eventWords.length : 0;
  const coverageScore = Math.round(Math.min(1, coverage) * 35);

  return {
    event,
    score: dateScore + wordScore + phraseScore + coverageScore,
    sharedWords,
    distanceDays,
  };
}

/**
 * Só confirma sozinho quando há evidência forte e vantagem clara sobre a segunda opção.
 * Assim, a automação elimina trabalho repetitivo sem inventar um vínculo histórico ambíguo.
 */
export function findConfidentNewsEventMatch(
  title: string,
  publicationDate: Date | null,
  events: NewsEventMatchCandidate[],
): NewsEventMatch | null {
  if (!publicationDate) return null;
  const matches = events
    .map((event) => scoreNewsEventMatch(title, publicationDate, event))
    .filter((match): match is NewsEventMatch => Boolean(match))
    .sort((a, b) => b.score - a.score);

  const best = matches[0];
  if (!best || best.score < 150) return null;
  const second = matches[1];
  if (second && best.score - second.score < 25) return null;
  return best;
}
