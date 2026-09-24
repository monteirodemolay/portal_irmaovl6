import type { Event, PersonalEvent } from '@vl6/domain';
import type { SessionAccessKind, SessionType, SessionWorkDegree } from '@vl6/shared';

export type CalendarSource = 'vl6' | 'google' | 'personal';
export type AgendaCategory =
  | 'sessao'
  | 'evento'
  | 'aniversario'
  | 'paramaconica'
  | 'outra'
  | 'personal'
  | 'google';

export const SOURCE_LABELS: Record<CalendarSource, string> = {
  vl6: 'VL6',
  google: 'Google',
  personal: 'Pessoal',
};

export const SOURCE_BADGE_CLASS: Record<CalendarSource, string> = {
  vl6: 'bg-primary/10 text-primary',
  google: 'bg-purple-100 text-purple-700',
  personal: 'bg-emerald-100 text-emerald-700',
};

export const CATEGORY_LABELS: Record<AgendaCategory, string> = {
  sessao: 'Sessão',
  evento: 'Evento',
  aniversario: 'Aniversário',
  paramaconica: 'Paramaçônica',
  outra: 'Outra data',
  personal: 'Pessoal',
  google: 'Google',
};

export const CATEGORY_BADGE_CLASS: Record<AgendaCategory, string> = {
  sessao: 'bg-primary/10 text-primary',
  evento: 'bg-sky-100 text-sky-700',
  aniversario: 'bg-amber-100 text-amber-800',
  paramaconica: 'bg-violet-100 text-violet-700',
  outra: 'bg-slate-100 text-slate-700',
  personal: 'bg-emerald-100 text-emerald-700',
  google: 'bg-purple-100 text-purple-700',
};

/** Recorte mínimo de um evento Google já sincronizado localmente — ver módulo `integrations`. */
export interface GoogleCalendarEventSummary {
  id: string;
  titulo: string;
  inicio: Date;
  fim: Date;
  local: string | null;
}

export type AgendaAnniversaryKind =
  | 'iniciacao'
  | 'elevacao'
  | 'exaltacao'
  | 'nascimento'
  | 'conjuge'
  | 'filho';

/**
 * Ocorrência calculada em tempo de request a partir do cadastro do Irmão.
 * Nunca é persistida como Event: evita depender do cron diário para exibir
 * aniversários futuros no calendário mensal.
 */
export interface AgendaAnniversarySummary {
  id: string;
  memberId: string;
  titulo: string;
  inicio: Date;
  kind: AgendaAnniversaryKind;
}

/** Modelo único de exibição para todas as origens da Agenda Central. */
export interface CalendarItem {
  id: string;
  source: CalendarSource;
  category: AgendaCategory;
  titulo: string;
  inicio: Date;
  /** `null` = sem horário de término definido ou ocorrência informativa. */
  fim: Date | null;
  local: string | null;
  /** Nome da entidade/contexto de origem, quando aplicável. */
  contextLabel: string | null;
  /** Aniversários e marcos calculados são informativos e não geram conflito de horário. */
  isInformational: boolean;
  isBirthday: boolean;
  /** Classificação estruturada da Sessão. */
  session: {
    sessionType: SessionType;
    sessionNature: string;
    degreeWork: SessionWorkDegree | null;
    access: SessionAccessKind | null;
  } | null;
}

function eventCategory(event: Event): AgendaCategory {
  if (event.tipo === 'sessao') return 'sessao';
  if (event.tipo === 'aniversario') return 'aniversario';
  if (event.agendaContext === 'paramaconica') return 'paramaconica';
  if (event.agendaContext === 'outro') return 'outra';
  return 'evento';
}

function normalizeTitle(titulo: string): string {
  return titulo.trim().toLocaleLowerCase('pt-BR');
}

const BIRTHDAY_DEDUP_TOLERANCE_MS = 36 * 60 * 60 * 1000;

export function toCalendarItems(
  vl6: Event[],
  personal: PersonalEvent[],
  google: GoogleCalendarEventSummary[],
  anniversaries: AgendaAnniversarySummary[] = [],
  paramasonicEntityNames: Record<string, string> = {},
): CalendarItem[] {
  const virtualBirthdays = anniversaries.filter((item) => item.kind === 'nascimento');

  const persistedVl6 = vl6.filter((event) => {
    if (event.tipo !== 'aniversario') return true;
    return !virtualBirthdays.some(
      (virtual) =>
        normalizeTitle(virtual.titulo) === normalizeTitle(event.titulo) &&
        Math.abs(virtual.inicio.getTime() - event.dataInicio.getTime()) <=
          BIRTHDAY_DEDUP_TOLERANCE_MS,
    );
  });

  const items: CalendarItem[] = [
    ...persistedVl6.map(
      (event): CalendarItem => ({
        id: event.id,
        source: 'vl6',
        category: eventCategory(event),
        titulo: event.titulo,
        inicio: event.dataInicio,
        fim: event.dataFim,
        local: event.local,
        contextLabel:
          event.agendaContext === 'paramaconica' && event.paramasonicEntityId
            ? (paramasonicEntityNames[event.paramasonicEntityId] ?? 'Entidade Paramaçônica')
            : event.agendaContext === 'outro'
              ? 'Outra atividade'
              : 'Verdadeira Luz nº 06',
        isInformational: event.tipo === 'aniversario',
        isBirthday: event.tipo === 'aniversario',
        session:
          event.tipo === 'sessao' && event.sessionType && event.sessionNature
            ? {
                sessionType: event.sessionType,
                sessionNature: event.sessionNature,
                degreeWork: event.degreeWork ?? null,
                access: event.access ?? null,
              }
            : null,
      }),
    ),
    ...anniversaries.map(
      (item): CalendarItem => ({
        id: item.id,
        source: 'vl6',
        category:
          item.kind === 'nascimento' || item.kind === 'conjuge' || item.kind === 'filho'
            ? 'aniversario'
            : 'outra',
        titulo: item.titulo,
        inicio: item.inicio,
        fim: null,
        local: null,
        contextLabel: item.kind === 'nascimento' ? 'Irmãos' : 'Datas e vínculos',
        isInformational: true,
        isBirthday:
          item.kind === 'nascimento' || item.kind === 'conjuge' || item.kind === 'filho',
        session: null,
      }),
    ),
    ...personal.map(
      (event): CalendarItem => ({
        id: event.id,
        source: 'personal',
        category: 'personal',
        titulo: event.titulo,
        inicio: event.dataInicio,
        fim: event.dataFim,
        local: event.local,
        contextLabel: 'Pessoal',
        isInformational: false,
        isBirthday: false,
        session: null,
      }),
    ),
    ...google.map(
      (event): CalendarItem => ({
        id: event.id,
        source: 'google',
        category: 'google',
        titulo: event.titulo,
        inicio: event.inicio,
        fim: event.fim,
        local: event.local,
        contextLabel: 'Google Agenda',
        isInformational: false,
        isBirthday: false,
        session: null,
      }),
    ),
  ];

  return items.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}

/**
 * IDs dos itens cujo horário se sobrepõe a outro. Ocorrências informativas
 * (aniversários e marcos) e itens sem término não participam da checagem.
 */
export function detectOverlaps(items: CalendarItem[]): Set<string> {
  const overlapping = new Set<string>();
  const relevant = items.filter(
    (item): item is CalendarItem & { fim: Date } => !item.isInformational && item.fim !== null,
  );

  for (let i = 0; i < relevant.length; i += 1) {
    for (let j = i + 1; j < relevant.length; j += 1) {
      const a = relevant[i]!;
      const b = relevant[j]!;
      if (a.inicio < b.fim && b.inicio < a.fim) {
        overlapping.add(a.id);
        overlapping.add(b.id);
      }
    }
  }

  return overlapping;
}
