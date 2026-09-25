import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hasPermission } from '@vl6/domain';
import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { cancelReservation, finalizeCapsule, getCapsule, removeCapsuleRecord, reserveCapsule } from '@/modules/cripta/lib/vault-inventory';
import { deletePrivateCiphertext, downloadPrivateCiphertext, uploadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 60;

/** Synthetic-only Wix + Firestore roundtrip. No user's text, files or keys. */
export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'tenant:manage') || !canAccessCriptaPilot(session.user.email) ||
      request.headers.get('origin') !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const id = randomUUID();
  const synthetic = randomBytes(1024);
  let fileId: string | undefined;
  let reserved = false;
  let finalized = false;
  try {
    await reserveCapsule(session.user.id, id);
    reserved = true;
    const uploaded = await uploadPrivateCiphertext(synthetic);
    fileId = uploaded.fileId;
    await finalizeCapsule(session.user.id, id, fileId, uploaded.sha256, synthetic.length);
    finalized = true;
    const record = await getCapsule(session.user.id, id);
    if (!record?.fileId || record.sha256 !== createHash('sha256').update(synthetic).digest('hex')) {
      throw new Error('Inventário inconsistente.');
    }
    const restored = await downloadPrivateCiphertext(record.fileId, record.sha256);
    if (!restored.equals(synthetic)) throw new Error('Conteúdo cifrado não íntegro.');
    await deletePrivateCiphertext(fileId);
    await removeCapsuleRecord(session.user.id, id, fileId);
    fileId = undefined;
    finalized = false;
    return NextResponse.json({ stored: true, restored: true, bytes: restored.length,
      cleanup: 'delete-requested-and-inventory-removed' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Ensaio integrado falhou. Confira Wix, Firestore e integridade.' }, { status: 502 });
  } finally {
    if (fileId) {
      try {
        await deletePrivateCiphertext(fileId);
        if (finalized) await removeCapsuleRecord(session.user.id, id, fileId);
      } catch { /* retain inventory for manual reconciliation */ }
    }
    if (reserved && !finalized) {
      try { await cancelReservation(session.user.id, id); } catch { /* requires reconciliation */ }
    }
  }
}
