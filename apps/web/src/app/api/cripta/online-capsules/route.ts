import { randomUUID } from 'node:crypto';
import {
  MAX_LETTERS,
  MAX_SEALED_REQUEST_BYTES,
  sealedRequestId,
  validateSealedRequest,
} from '@/modules/cripta/lib/sealed-request';
import { criptaCryptoRef } from '@/modules/cripta/lib/cripta-crypto-state';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { isReceivingWindowOpen } from '@/modules/cripta/lib/receiving-window';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import {
  deletePrivateCiphertext,
  downloadPrivateCiphertext,
  uploadPrivateCiphertext,
} from '@/modules/cripta/lib/wix-private-files';
import { isOnlineOpen, openingRef } from '@/modules/cripta/lib/online-opening';

export const runtime = 'nodejs';
export const maxDuration = 60;
const collection = () => getAdminFirestore().collection('criptaOnlineCapsulesV1');

export async function GET() {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const docs = await collection().where('uid', '==', session.user.id).get();
  return NextResponse.json(
    {
      items: docs.docs
        .filter(
          (doc) =>
            doc.data().tenantId === session.authContext.tenantId && doc.data().status === 'ready',
        )
        .map((doc) => ({
          id: doc.id,
          createdAt: doc.data().createdAt,
          format: doc.data().format as string,
        })),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

export async function POST(request: Request) {
  const session = await activeCriptaSession();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin)
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  if (Number(request.headers.get('content-length') ?? 0) > MAX_SEALED_REQUEST_BYTES)
    return NextResponse.json({ error: 'Carta acima do limite atual.' }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > MAX_SEALED_REQUEST_BYTES)
    return NextResponse.json({ error: 'Carta acima do limite atual.' }, { status: 413 });
  try {
    if (!(await validateSealedRequest(JSON.parse(body)))) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Formato cifrado inválido.' }, { status: 400 });
  }
  const tenantId = session.authContext.tenantId;
  const uid = session.user.id;
  const db = getAdminFirestore();
  const id = sealedRequestId(tenantId, uid, body);
  const ref = collection().doc(id);
  const existing = await ref.get();
  const options = { headers: { 'Cache-Control': 'no-store, private' } };
  // Read authorization is already checked; confirming an existing receipt does not reopen writing.
  if (existing.data()?.status === 'ready')
    return NextResponse.json({ id, createdAt: existing.data()!.createdAt }, options);
  if (!(await isOnlineOpen(tenantId)))
    return NextResponse.json({ error: 'Recebimento fechado.' }, { status: 403 });
  let uploaded: { fileId: string; sha256: string } | undefined;
  let retained = false;
  try {
    uploaded = await uploadPrivateCiphertext(Buffer.from(body, 'utf8'));
    await downloadPrivateCiphertext(uploaded.fileId, uploaded.sha256);
    const mutex = db.collection('criptaDepositLocksV1').doc(tenantId).collection('users').doc(uid);
    const createdAt = await db.runTransaction(async (transaction) => {
      const [current, opening, keyState, lock, letters] = await Promise.all([
        transaction.get(ref),
        transaction.get(openingRef(tenantId)),
        transaction.get(criptaCryptoRef(tenantId)),
        transaction.get(mutex),
        transaction.get(collection().where('uid', '==', uid)),
      ]);
      if (current.data()?.status === 'ready') return current.data()!.createdAt as string;
      if (current.exists) throw new Error('Esta tentativa já foi retirada. Atualize a página.');
      if (!isReceivingWindowOpen(opening.data()))
        throw new Error('Recebimento fechado durante o envio.');
      const key = keyState.data()?.publicKey;
      if (!key || request.headers.get('x-cripta-key') !== `${key.x}.${key.y}`)
        throw new Error('A chave da Cripta mudou ou está indisponível. Atualize a página.');
      const count = letters.docs.filter(
        (doc) =>
          doc.data().tenantId === tenantId &&
          ['ready', 'deletion_pending'].includes(doc.data().status),
      ).length;
      if (count >= MAX_LETTERS) throw new Error('Limite de cinco cartas atingido.');
      const at = new Date().toISOString();
      transaction.create(ref, {
        tenantId,
        uid,
        fileId: uploaded!.fileId,
        sha256: uploaded!.sha256,
        createdAt: at,
        status: 'ready',
        format: 'vl6-cripta-seal-v1',
        publicKey: key,
      });
      transaction.set(mutex, { revision: Number(lock.data()?.revision ?? 0) + 1 });
      return at;
    });
    // A concurrent retry may have committed another upload under the same stable ID.
    retained = (await ref.get()).data()?.fileId === uploaded.fileId;
    return NextResponse.json({ id, createdAt }, { status: 201, ...options });
  } catch (error) {
    // On an ambiguous commit response, preserve the object. Reconciliation can remove an orphan;
    // deleting a possibly committed upload would make the confirmed letter unrecoverable.
    if (uploaded) {
      try {
        retained = (await ref.get()).data()?.fileId === uploaded.fileId;
      } catch {
        retained = true;
      }
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error &&
          /Recebimento|chave da Cripta|Limite de cinco|tentativa já/.test(error.message)
            ? error.message
            : 'O envio não foi confirmado. Tente novamente sem alterar a carta.',
      },
      { status: 409 },
    );
  } finally {
    if (uploaded && !retained) {
      try {
        await deletePrivateCiphertext(uploaded.fileId);
      } catch {
        await db
          .collection('criptaCleanupPendingV1')
          .doc(randomUUID())
          .create({
            fileId: uploaded.fileId,
            tenantId,
            uid,
            reason: 'uncommitted-letter',
            createdAt: new Date().toISOString(),
          })
          .catch(() => undefined);
      }
    }
  }
}
