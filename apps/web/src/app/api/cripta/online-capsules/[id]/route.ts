import { randomUUID } from 'node:crypto';
import { isReceivingWindowOpen } from '@/modules/cripta/lib/receiving-window';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import {
  deletePrivateCiphertext,
  downloadPrivateCiphertext,
} from '@/modules/cripta/lib/wix-private-files';
import { openForAccount } from '@/modules/cripta/lib/account-envelope';
import { isOnlineOpen, openingRef } from '@/modules/cripta/lib/online-opening';

export const runtime = 'nodejs';
const collection = () => getAdminFirestore().collection('criptaOnlineCapsulesV1');

async function find(request: Request, id: string) {
  const session = await activeCriptaSession();
  if (!session || !/^[a-f0-9-]{36}$/.test(id)) return null;
  if (request.method === 'DELETE' && request.headers.get('origin') !== new URL(request.url).origin)
    return null;
  const reference = collection().doc(id);
  const snap = await reference.get();
  const data = snap.data();
  if (
    !data ||
    data.uid !== session.user.id ||
    data.tenantId !== session.authContext.tenantId ||
    data.status !== 'ready'
  )
    return null;
  return { reference, data, session };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await find(request, (await params).id);
  if (!found) return NextResponse.json({ error: 'Carta não encontrada.' }, { status: 404 });
  try {
    const bytes = await downloadPrivateCiphertext(
      found.data.fileId as string,
      found.data.sha256 as string,
    );
    // Only the transitional server-key format can be opened here; every other format
    // (including the current vl6-online-capsule-v1) is opaque to the server — the
    // member's browser decrypts it with their own passphrase.
    const content =
      found.data.format === 'vl6-account-letter-v1'
        ? await openForAccount(
            bytes,
            found.session.authContext.tenantId,
            found.session.user.id,
            (await params).id,
          )
        : bytes;
    return new Response(new Uint8Array(content), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível conferir e recuperar a carta.' },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const found = await find(request, (await params).id);
  if (!found) return NextResponse.json({ error: 'Carta não encontrada.' }, { status: 404 });
  if (!(await isOnlineOpen(found.session.authContext.tenantId)))
    return NextResponse.json(
      { error: 'A Cripta está lacrada. Registre a abertura antes de excluir.' },
      { status: 403 },
    );
  try {
    const db = getAdminFirestore();
    const pending = db.collection('criptaCleanupPendingV1').doc(randomUUID());
    await db.runTransaction(async (transaction) => {
      const [current, opening] = await Promise.all([
        transaction.get(found.reference),
        transaction.get(openingRef(found.session.authContext.tenantId)),
      ]);
      if (!isReceivingWindowOpen(opening.data()) || current.data()?.status !== 'ready')
        throw new Error('Estado alterado durante a exclusão.');
      transaction.update(found.reference, {
        status: 'deleted',
        deletedAt: new Date().toISOString(),
      });
      transaction.create(pending, {
        fileId: found.data.fileId,
        tenantId: found.session.authContext.tenantId,
        uid: found.session.user.id,
        createdAt: new Date().toISOString(),
        reason: 'deleted-letter',
      });
    });
    try {
      await deletePrivateCiphertext(found.data.fileId as string);
      await pending.delete();
    } catch {
      /* Preserved queue documents the provider cleanup still pending. */
    }
    return NextResponse.json(
      { deleted: true, providerCleanupPending: (await pending.get()).exists },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json(
      { error: 'Exclusão não confirmada. Verifique novamente.' },
      { status: 502 },
    );
  }
}
