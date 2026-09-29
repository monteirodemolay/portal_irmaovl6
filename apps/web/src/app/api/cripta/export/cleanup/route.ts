import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { sealRef, currentInventory } from '@/modules/cripta/lib/seal-state';
import { deletePrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Requests removal of every exported object from Wix. Only unlocks once the physical-unit
 * check (physical-units route) has recorded a matching, successful reading of the two units
 * for THIS exact sealed receipt — this route never runs on trust alone. A response here is an
 * API acknowledgement, not proof the provider's own backups are gone (see cripta-manual-operacional.md). */
export async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (
    !canAccessCriptaPilot(session.user.email) ||
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }
  const tenantId = session.authContext.tenantId;
  const ref = sealRef(tenantId);
  const receipt = (await ref.get()).data();
  if (!receipt || receipt.status !== 'sealed') {
    return NextResponse.json({ error: 'Não há lacração vigente para limpar.' }, { status: 409 });
  }
  const check = receipt.physicalCheck as { receiptDigest?: string; units?: string[] } | undefined;
  if (check?.receiptDigest !== receipt.receiptDigest) {
    return NextResponse.json(
      {
        error: 'Confira as duas unidades físicas contra este recibo antes de solicitar a limpeza.',
      },
      { status: 409 },
    );
  }
  const actual = await currentInventory(tenantId);
  if (actual.digest !== receipt.inventoryDigest || actual.count !== receipt.count) {
    return NextResponse.json(
      { error: 'O inventário mudou desde a lacração e a conferência. Audite antes de limpar.' },
      { status: 409 },
    );
  }
  const db = getAdminFirestore();
  const [letters, drafts] = await Promise.all([
    db.collection('criptaOnlineCapsulesV1').get(),
    db.collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').get(),
  ]);
  const failed: Array<{ kind: string; id: string; error: string }> = [];
  let deletedLetters = 0;
  let deletedDrafts = 0;
  for (const doc of letters.docs) {
    const data = doc.data();
    if (data.tenantId !== tenantId || data.status !== 'ready') continue;
    try {
      await deletePrivateCiphertext(data.fileId as string);
      await doc.ref.update({ status: 'archived-offline', archivedAt: new Date().toISOString() });
      deletedLetters++;
    } catch (error) {
      failed.push({
        kind: 'letter',
        id: doc.id,
        error: error instanceof Error ? error.message : 'falha',
      });
    }
  }
  for (const doc of drafts.docs) {
    const data = doc.data();
    try {
      await deletePrivateCiphertext(data.fileId as string);
      await doc.ref.delete();
      deletedDrafts++;
    } catch (error) {
      failed.push({
        kind: 'draft',
        id: doc.id,
        error: error instanceof Error ? error.message : 'falha',
      });
    }
  }
  const cleanup = {
    at: new Date().toISOString(),
    operatorId: session.user.id,
    receiptCode: receipt.code,
    deletedLetters,
    deletedDrafts,
    failed,
    complete: failed.length === 0,
  };
  await ref.update({ cleanup });
  return NextResponse.json(
    { cleanup },
    {
      status: failed.length ? 207 : 200,
      headers: { 'Cache-Control': 'no-store, private' },
    },
  );
}
