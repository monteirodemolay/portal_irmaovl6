import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { sealRef, currentInventory } from '@/modules/cripta/lib/seal-state';
import { parseLacreFile } from '@/modules/cripta/lib/lacre-format';
import { uploadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Prepares a new writing window from the .lacre file already verified on a physical unit.
 * Only DRAFTS come back online — they use the per-account key the server already holds
 * (account-envelope.ts), so restoring them just moves their still-encrypted bytes from the
 * .lacre file back into Wix. Sealed LETTERS are never restored: they were sealed against the
 * Cripta's single public key and only the Guardiões, offline, can ever open them again — putting
 * that ciphertext back on Wix would serve no one and would undo the reason the custody model was
 * changed. Their Firestore record already stays (status 'archived-offline') for the audit trail;
 * this route only counts them to report an honest total back to the operator. */
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
    return NextResponse.json(
      {
        error:
          'Só é possível restaurar enquanto a Cripta está lacrada, antes de reabrir a escrita.',
      },
      { status: 409 },
    );
  }
  const cleanup = receipt.cleanup as { receiptCode?: string; complete?: boolean } | undefined;
  if (cleanup?.receiptCode !== receipt.code || cleanup?.complete !== true) {
    return NextResponse.json(
      { error: 'A limpeza do Wix deste lacre ainda não foi concluída; não há o que restaurar.' },
      { status: 409 },
    );
  }
  let file: File;
  try {
    const form = await request.formData();
    const uploaded = form.get('file');
    if (!(uploaded instanceof File)) throw new Error('missing');
    file = uploaded;
  } catch {
    return NextResponse.json(
      { error: 'Envie o arquivo .lacre lido da unidade física.' },
      { status: 400 },
    );
  }
  if (file.size < 20 || file.size > 200_000_000) {
    return NextResponse.json({ error: 'Arquivo .lacre com tamanho inesperado.' }, { status: 400 });
  }
  let parsed: Awaited<ReturnType<typeof parseLacreFile>>;
  try {
    parsed = await parseLacreFile(new Uint8Array(await file.arrayBuffer()));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Não foi possível ler o arquivo .lacre.' },
      { status: 400 },
    );
  }
  if (
    parsed.header.codigoLacracao !== receipt.code ||
    parsed.header.inventoryDigest !== receipt.inventoryDigest ||
    parsed.header.totalCartas !== receipt.letters
  ) {
    return NextResponse.json(
      { error: 'Este arquivo não corresponde ao recibo da lacração vigente. Confira a unidade.' },
      { status: 409 },
    );
  }
  const db = getAdminFirestore();
  const draftEntries = parsed.entries.filter((entry) => entry.kind === 'draft');
  const letterEntries = parsed.entries.filter((entry) => entry.kind === 'letter');
  let restored = 0;
  let skipped = 0;
  const failed: Array<{ uid: string; error: string }> = [];
  for (const entry of draftEntries) {
    const draftRef = db
      .collection('criptaOnlineDraftsV1')
      .doc(tenantId)
      .collection('users')
      .doc(entry.uid);
    try {
      if ((await draftRef.get()).exists) {
        skipped++;
        continue;
      }
      const uploaded = await uploadPrivateCiphertext(Buffer.from(entry.bytes));
      if (uploaded.sha256 !== entry.sha256)
        throw new Error('Integridade divergente após reenvio ao Wix.');
      await draftRef.create({
        fileId: uploaded.fileId,
        sha256: uploaded.sha256,
        revision: 0,
        updatedAt: new Date().toISOString(),
        tenantId,
        uid: entry.uid,
        restoredFrom: receipt.code,
      });
      restored++;
    } catch (error) {
      failed.push({ uid: entry.uid, error: error instanceof Error ? error.message : 'falha' });
    }
  }
  const inventory = await currentInventory(tenantId);
  const restoration = {
    at: new Date().toISOString(),
    operatorId: session.user.id,
    receiptCode: receipt.code,
    restoredDrafts: restored,
    skippedDrafts: skipped,
    archivedLetters: letterEntries.length,
    failed,
    complete: failed.length === 0,
    inventoryDigest: inventory.digest,
    inventoryCount: inventory.count,
  };
  await ref.update({ restoration });
  return NextResponse.json(
    { restoration },
    { status: failed.length ? 207 : 200, headers: { 'Cache-Control': 'no-store, private' } },
  );
}
