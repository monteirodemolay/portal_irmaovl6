import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { NextResponse } from 'next/server';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import {
  isDeliveryMode,
  letterRecordsCollection,
  type LetterHistoryAction,
} from '@/modules/cripta/lib/letter-record';

export const runtime = 'nodejs';

/** The Irmão's own view of their sealed letters — label and delivery mode only, never the
 * ciphertext. Available whenever writing is open (first opening or any later reabertura), so a
 * letter sealed years ago can still be retained or have its delivery mode changed today, without
 * ever being decrypted by anyone. */
export const GET = criptaRoute(async function GET() {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const docs = await letterRecordsCollection(session.authContext.tenantId)
    .where('ownerUid', '==', session.user.id)
    .get();
  return NextResponse.json(
    {
      items: docs.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
});

export const PATCH = criptaRoute(async function PATCH(request: Request) {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 });
  }
  const body = input as { id?: unknown; action?: unknown; deliveryMode?: unknown };
  if (typeof body.id !== 'string')
    return NextResponse.json({ error: 'Informe a carta.' }, { status: 400 });
  const action = body.action;
  if (action !== 'retida' && action !== 'reativada' && action !== 'modo_alterado')
    return NextResponse.json({ error: 'Ação não reconhecida.' }, { status: 400 });
  if (action === 'modo_alterado' && !isDeliveryMode(body.deliveryMode))
    return NextResponse.json({ error: 'Modo de entrega inválido.' }, { status: 400 });

  const tenantId = session.authContext.tenantId;
  const uid = session.user.id;
  const ref = letterRecordsCollection(tenantId).doc(body.id);
  try {
    await ref.firestore.runTransaction(async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.data();
      if (!data || data.ownerUid !== uid) throw new Error('Carta não encontrada.');
      const at = new Date().toISOString();
      const historyEntry = { at, actorUid: uid, action: action as LetterHistoryAction };
      const patch: Record<string, unknown> = {
        updatedAt: at,
        history: [...(Array.isArray(data.history) ? data.history : []), historyEntry],
      };
      if (action === 'retida') patch.status = 'retida';
      if (action === 'reativada') patch.status = 'ativa';
      if (action === 'modo_alterado') patch.deliveryMode = body.deliveryMode;
      transaction.update(ref, patch);
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível atualizar.' },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store, private' } });
});
