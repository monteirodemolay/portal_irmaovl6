import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { createServerContainer } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  CEREMONIES,
  eventsForCeremony,
  type Ceremony,
  type CeremonyEvent,
} from '@/modules/cripta/lib/ceremony-events';

export const runtime = 'nodejs';

const CEREMONY_TITLE: Record<Ceremony, string> = {
  inauguracao: 'Inauguração da Cripta do Irmão',
  abertura: 'Abertura do recebimento de cartas',
  fechamento: 'Fechamento e lacração',
  reabertura: 'Reabertura do recebimento de cartas',
};

const EVENT_LABEL: Record<string, string> = {
  'sorteio.resultado': 'Sorteio dos Guardiões',
  'sorteio.redraw': 'Sorteio refeito',
  inaugurated: 'Cripta inaugurada',
  opened: 'Recebimento aberto',
  closed: 'Recebimento encerrado',
  unsealed: 'Lacre anterior rompido',
  sealed: 'Cripta lacrada',
};

function memberIdsIn(event: CeremonyEvent): string[] {
  const ids = new Set<string>();
  for (const [key, value] of Object.entries(event)) {
    if (!/Id$|Ids$|MemberId$/i.test(key)) continue;
    if (typeof value === 'string') ids.add(value);
    if (Array.isArray(value)) for (const item of value) if (typeof item === 'string') ids.add(item);
  }
  return [...ids];
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
  );
}

/** Read-only, built fresh from the same event sources the Projetor reads — never a second copy
 * kept in sync by hand. Names são resolvidos aqui, não guardados nos eventos, para o registro
 * permanente continuar só com identificadores até o momento em que alguém de fato pede o
 * relatório para o registro histórico. */
export const GET = criptaRoute(async function GET(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  const url = new URL(request.url);
  const ceremony = url.searchParams.get('ceremony');
  if (!ceremony || !(CEREMONIES as readonly string[]).includes(ceremony))
    return NextResponse.json({ error: 'Informe uma cerimônia válida.' }, { status: 400 });
  const tenantId = session.authContext.tenantId;
  const events = await eventsForCeremony(tenantId, ceremony as Ceremony);
  const container = createServerContainer();
  const ids = [...new Set(events.flatMap(memberIdsIn))];
  const members = await Promise.all(ids.map((id) => container.repositories.member.findById(id)));
  const names = new Map(ids.map((id, index) => [id, members[index]?.nomeCompleto ?? id]));

  const rows = events
    .map((event) => {
      const label = EVENT_LABEL[event.type ?? ''] ?? event.type ?? 'Evento';
      const others = Array.isArray(event.presentOthers)
        ? event.presentOthers.filter((name): name is string => typeof name === 'string')
        : [];
      const participantes = [
        ...memberIdsIn(event).map((id) => names.get(id) ?? id),
        ...others,
      ].join(', ');
      const ata = typeof event.minutes === 'string' && event.minutes ? event.minutes : '';
      const at = typeof event.at === 'string' ? new Date(event.at).toLocaleString('pt-BR') : '';
      return `<tr><td>${escapeHtml(at)}</td><td>${escapeHtml(label)}</td><td>${escapeHtml(participantes)}</td><td>${escapeHtml(ata)}</td></tr>`;
    })
    .join('\n');

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(CEREMONY_TITLE[ceremony as Ceremony])} — Cripta do Irmão VL6</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #142a43; margin: 2.5rem auto; max-width: 820px; }
  h1 { font-size: 1.6rem; border-bottom: 2px solid #c9a449; padding-bottom: .5rem; }
  .eyebrow { text-transform: uppercase; letter-spacing: .15em; color: #8a682d; font-size: .8rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
  th, td { border-bottom: 1px solid #ddd0b7; padding: .6rem .5rem; text-align: left; font-size: .95rem; }
  th { color: #8a682d; text-transform: uppercase; font-size: .75rem; letter-spacing: .05em; }
  footer { margin-top: 2rem; font-size: .8rem; color: #536074; }
</style>
</head>
<body>
  <p class="eyebrow">Loja Maçônica Verdadeira Luz nº 06 · Oriente do Piauí · Cripta do Irmão</p>
  <h1>${escapeHtml(CEREMONY_TITLE[ceremony as Ceremony])}</h1>
  <table>
    <thead><tr><th>Quando</th><th>Ato</th><th>Participantes</th><th>Ata</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4">Nenhum registro ainda para esta cerimônia.</td></tr>'}</tbody>
  </table>
  <footer>Gerado a partir do registro permanente de eventos da Cripta, para o registro histórico da Loja. Não contém conteúdo de carta nem a ficha de retenção de nenhum Irmão.</footer>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, private' },
  });
});
