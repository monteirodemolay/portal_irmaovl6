import { NextResponse } from 'next/server';
import { createServerContainer } from '@vl6/infra';
import { resolveEventEnd } from '@vl6/shared';
import { findCalendarFeedOwnerByToken } from '@/lib/agenda/calendar-feed-token';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function formatUtcCompact(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 12, 0, 0);
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

interface FeedItem {
  uid: string;
  titulo: string;
  descricao: string | null;
  local: string | null;
  inicio: Date;
  fim: Date | null;
  allDay: boolean;
}

function buildFeed(items: FeedItem[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Portal do Irmão VL6//Agenda Central//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Agenda Central VL6',
    'X-PUBLISHED-TTL:PT6H',
    'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
  ];

  for (const item of items) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${escapeIcsText(item.uid)}`);
    lines.push(`DTSTAMP:${formatUtcCompact(new Date())}`);

    if (item.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${formatDateOnly(item.inicio)}`);
      lines.push(`DTEND;VALUE=DATE:${formatDateOnly(addDays(item.inicio, 1))}`);
    } else {
      lines.push(`DTSTART:${formatUtcCompact(item.inicio)}`);
      lines.push(`DTEND:${formatUtcCompact(resolveEventEnd(item.inicio, item.fim))}`);
    }

    lines.push(`SUMMARY:${escapeIcsText(item.titulo)}`);
    if (item.local) lines.push(`LOCATION:${escapeIcsText(item.local)}`);
    if (item.descricao) lines.push(`DESCRIPTION:${escapeIcsText(item.descricao)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;
  const owner = await findCalendarFeedOwnerByToken(token);
  if (!owner) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const container = createServerContainer();
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear() + 1, now.getMonth() + 2, 0);
  const withinDays = Math.ceil((to.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) + 2;

  const ctx = {
    uid: owner.userId,
    tenantId: owner.tenantId,
    roleId: 'calendar-feed',
    permissions: ['event:read', 'member:read'] as const,
  };

  const [events, personalEvents, anniversaryEntries] = await Promise.all([
    container.useCases.listEventsInRange.execute(ctx, { from, to }),
    container.repositories.personalEvent.listByUserInRange(
      owner.tenantId,
      owner.userId,
      from,
      to,
    ),
    container.useCases.listUpcomingAnniversaries.execute(ctx, { withinDays }),
  ]);

  const feedItems: FeedItem[] = [
    ...events.map((event) => ({
      uid: `vl6-${event.id}@portal.vl6.com.br`,
      titulo: event.titulo,
      descricao: event.descricao,
      local: event.local,
      inicio: event.dataInicio,
      fim: event.dataFim,
      allDay: event.tipo === 'aniversario',
    })),
    ...personalEvents.map((event) => ({
      uid: `personal-${event.id}-${owner.userId}@portal.vl6.com.br`,
      titulo: event.titulo,
      descricao: event.descricao,
      local: event.local,
      inicio: event.dataInicio,
      fim: event.dataFim,
      allDay: false,
    })),
  ];

  const existingBirthdayKeys = new Set(
    feedItems
      .filter((item) => item.allDay)
      .map((item) => `${formatDateOnly(item.inicio)}|${item.titulo.toLocaleLowerCase('pt-BR')}`),
  );

  anniversaryEntries.forEach((entry, index) => {
    const occurrence = addDays(now, entry.diasAte);
    const titulo =
      entry.kind === 'nascimento'
        ? `Aniversário de ${entry.nomeCompleto}`
        : entry.kind === 'conjuge'
          ? `Aniversário de ${entry.conjugeNome ?? 'cônjuge'} · família de ${entry.nomeCompleto}`
          : entry.kind === 'filho'
            ? `Aniversário de ${entry.filhoNome ?? 'filho(a)'} · família de ${entry.nomeCompleto}`
            : entry.kind === 'iniciacao'
              ? `Aniversário de Iniciação · ${entry.nomeCompleto}`
              : entry.kind === 'elevacao'
                ? `Aniversário de Elevação · ${entry.nomeCompleto}`
                : `Aniversário de Exaltação · ${entry.nomeCompleto}`;

    const key = `${formatDateOnly(occurrence)}|${titulo.toLocaleLowerCase('pt-BR')}`;
    if (existingBirthdayKeys.has(key)) return;

    feedItems.push({
      uid: `anniversary-${entry.kind}-${entry.memberId}-${occurrence.getFullYear()}-${index}@portal.vl6.com.br`,
      titulo,
      descricao: null,
      local: null,
      inicio: occurrence,
      fim: null,
      allDay: true,
    });
  });

  feedItems.sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const headers = new Headers();
  headers.set('Content-Type', 'text/calendar; charset=utf-8');
  headers.set('Content-Disposition', 'inline; filename="agenda-vl6.ics"');
  headers.set('Cache-Control', 'private, max-age=300');
  headers.set('X-Robots-Tag', 'noindex, nofollow');

  return new NextResponse(buildFeed(feedItems), { headers });
}
