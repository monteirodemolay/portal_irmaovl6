import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { criptaCryptoRef } from '@/modules/cripta/lib/cripta-crypto-state';
import { openingRef } from '@/modules/cripta/lib/online-opening';
import { sealRef } from '@/modules/cripta/lib/seal-state';

export const runtime = 'nodejs';
const CEREMONIES = ['inauguracao', 'abertura', 'fechamento', 'reabertura'] as const;
type Ceremony = (typeof CEREMONIES)[number];

/** Reads, never writes. Every event already exists under its own ceremony's document
 * (criptaCryptoV1 for inauguração/sorteio, criptaOnlineOpeningV1 for abertura/fechamento,
 * criptaSealsV1 for lacração) — this just joins them in chronological order so the Projetor and
 * the relatório de anais each read one feed instead of three. Abertura e reabertura share the
 * same 'opened' events (reabertura is structurally a later abertura); fechamento folds in the
 * lacração that always follows it. */
async function eventsFor(tenantId: string, ceremony: Ceremony) {
  const sources =
    ceremony === 'inauguracao'
      ? [criptaCryptoRef(tenantId).collection('events')]
      : ceremony === 'abertura' || ceremony === 'reabertura'
        ? [openingRef(tenantId).collection('events')]
        : [openingRef(tenantId).collection('events'), sealRef(tenantId).collection('events')];
  const snapshots = await Promise.all(sources.map((source) => source.get()));
  const events = snapshots
    .flatMap((snapshot) => snapshot.docs)
    .map((doc) => ({ id: doc.id, ...doc.data() }) as { id: string; type?: string; at?: string })
    .filter((event) =>
      ceremony === 'fechamento' ? event.type !== 'opened' : event.type !== 'closed',
    )
    .sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  return events;
}

export const GET = criptaRoute(async function GET(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  const ceremony = new URL(request.url).searchParams.get('ceremony');
  if (!ceremony || !(CEREMONIES as readonly string[]).includes(ceremony))
    return NextResponse.json({ error: 'Informe uma cerimônia válida.' }, { status: 400 });
  const events = await eventsFor(session.authContext.tenantId, ceremony as Ceremony);
  return NextResponse.json(
    { ceremony, events },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
});
