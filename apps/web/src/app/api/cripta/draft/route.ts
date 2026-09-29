import { randomUUID } from 'node:crypto';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { isReceivingWindowOpen } from '@/modules/cripta/lib/receiving-window';
import { activeCriptaSession } from '@/modules/cripta/lib/active-member';
import { openForAccount, sealForAccount } from '@/modules/cripta/lib/account-envelope';
import { isOnlineOpen, openingRef } from '@/modules/cripta/lib/online-opening';
import { parseOnlineLetter } from '@/modules/cripta/lib/online-letter';
import {
  deletePrivateCiphertext,
  downloadPrivateCiphertext,
  uploadPrivateCiphertext,
} from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 60;

const reference = (tenantId: string, uid: string) =>
  getAdminFirestore().collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').doc(uid);
const options = { headers: { 'Cache-Control': 'no-store' } };

async function recordCleanup(fileId: string, tenantId: string, uid: string) {
  await getAdminFirestore().collection('criptaCleanupPendingV1').doc(randomUUID()).create({
    fileId,
    tenantId,
    uid,
    createdAt: new Date().toISOString(),
    reason: 'superseded-draft',
  });
}

export async function GET() {
  const session = await activeCriptaSession();
  if (!session) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const tenantId = session.authContext.tenantId;
  const uid = session.user.id;
  const snap = await reference(tenantId, uid).get();
  const data = snap.data();
  if (!data || !data.fileId)
    return NextResponse.json({ draft: null, revision: data?.revision ?? 0 }, options);
  try {
    const encrypted = await downloadPrivateCiphertext(data.fileId as string, data.sha256 as string);
    const plaintext = await openForAccount(encrypted, tenantId, uid, `draft:${uid}`);
    const draft = parseOnlineLetter(plaintext.toString('utf8'), false);
    return NextResponse.json(
      { draft, revision: data.revision, updatedAt: data.updatedAt },
      options,
    );
  } catch {
    return NextResponse.json(
      { error: 'O rascunho não pôde ser recuperado. Nada foi substituído.' },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await activeCriptaSession();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const tenantId = session.authContext.tenantId;
  const uid = session.user.id;
  if (!(await isOnlineOpen(tenantId)))
    return NextResponse.json({ error: 'Recebimento fechado.' }, { status: 403 });
  const declaredSize = Number(request.headers.get('content-length') ?? 0);
  if (declaredSize > 3_700_000)
    return NextResponse.json({ error: 'Rascunho acima do limite atual.' }, { status: 413 });
  let payload: { revision: number; letter: unknown };
  try {
    payload = (await request.json()) as { revision: number; letter: unknown };
    if (!Number.isSafeInteger(payload.revision) || payload.revision < 0)
      throw new Error('Revisão inválida.');
    parseOnlineLetter(JSON.stringify(payload.letter), false, true);
  } catch {
    return NextResponse.json({ error: 'Rascunho inválido.' }, { status: 400 });
  }
  const ref = reference(tenantId, uid);
  let uploaded: { fileId: string; sha256: string } | undefined;
  let previousFileId: string | undefined;
  let committed = false;
  try {
    const bytes = Buffer.from(JSON.stringify(payload.letter), 'utf8');
    uploaded = await uploadPrivateCiphertext(
      await sealForAccount(bytes, tenantId, uid, `draft:${uid}`),
    );
    // A successful PUT means the actual ciphertext can be read from Wix.
    await downloadPrivateCiphertext(uploaded.fileId, uploaded.sha256);
    const updatedAt = new Date().toISOString();
    await getAdminFirestore().runTransaction(async (transaction) => {
      const [current, opening] = await Promise.all([
        transaction.get(ref),
        transaction.get(openingRef(tenantId)),
      ]);
      if (!isReceivingWindowOpen(opening.data()))
        throw new Error('Recebimento fechado durante o salvamento.');
      const data = current.data();
      if ((data?.revision ?? 0) !== payload.revision) throw new Error('REVISION_CONFLICT');
      previousFileId = data?.fileId as string | undefined;
      transaction.set(ref, {
        fileId: uploaded!.fileId,
        sha256: uploaded!.sha256,
        revision: payload.revision + 1,
        updatedAt,
        tenantId,
        uid,
      });
    });
    committed = true;
    if (previousFileId) {
      try {
        await deletePrivateCiphertext(previousFileId);
      } catch {
        try {
          await recordCleanup(previousFileId, tenantId, uid);
        } catch {
          /* reconciliation required */
        }
      }
    }
    return NextResponse.json({ revision: payload.revision + 1, updatedAt }, options);
  } catch (error) {
    if (uploaded && !committed) {
      // Preserve the upload if Firestore may have committed despite a lost response.
      try {
        committed = (await ref.get()).data()?.fileId === uploaded.fileId;
      } catch {
        committed = true;
      }
    }
    if (uploaded && !committed) {
      try {
        await deletePrivateCiphertext(uploaded.fileId);
      } catch {
        try {
          await recordCleanup(uploaded.fileId, tenantId, uid);
        } catch {
          /* reconciliation required */
        }
      }
    }
    if (error instanceof Error && error.message === 'REVISION_CONFLICT') {
      return NextResponse.json(
        { error: 'O rascunho foi alterado em outra aba. Atualize a página antes de continuar.' },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: 'O rascunho não foi salvo. Tente novamente.' },
      { status: 502 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await activeCriptaSession();
  if (!session || request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  if (!(await isOnlineOpen(session.authContext.tenantId)))
    return NextResponse.json({ error: 'Recebimento fechado.' }, { status: 403 });
  const ref = reference(session.authContext.tenantId, session.user.id);
  const expected = Number(request.headers.get('x-draft-revision'));
  if (!request.headers.has('x-draft-revision') || !Number.isSafeInteger(expected) || expected < 0)
    return NextResponse.json({ error: 'Informe a revisão do rascunho.' }, { status: 400 });
  try {
    const revision = await getAdminFirestore().runTransaction(async (transaction) => {
      const [snap, opening] = await Promise.all([
        transaction.get(ref),
        transaction.get(openingRef(session.authContext.tenantId)),
      ]);
      if (!isReceivingWindowOpen(opening.data())) throw new Error('Recebimento fechado.');
      if ((snap.data()?.revision ?? 0) !== expected)
        throw new Error('O rascunho mudou em outra aba. Ele foi preservado.');
      const fileId = snap.data()?.fileId as string | undefined;
      // Detach atomically before cleanup: no stale DELETE can erase the file of a newer draft.
      transaction.set(ref, {
        status: 'deleted',
        revision: expected + 1,
        tenantId: session.authContext.tenantId,
        uid: session.user.id,
        updatedAt: new Date().toISOString(),
      });
      if (fileId)
        transaction.create(
          getAdminFirestore().collection('criptaCleanupPendingV1').doc(randomUUID()),
          {
            fileId,
            tenantId: session.authContext.tenantId,
            uid: session.user.id,
            createdAt: new Date().toISOString(),
            reason: 'deleted-draft',
          },
        );
      return expected + 1;
    });
    return NextResponse.json({ deleted: true, revision }, options);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível remover o rascunho.' },
      { status: 409 },
    );
  }
}
