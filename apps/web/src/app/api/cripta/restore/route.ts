import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
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
export const POST = criptaRoute(async function POST(request: Request) {
  const session = await requirePagePermission('tenant:manage');
  if (request.headers.get('origin') !== new URL(request.url).origin) {
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
  // Antes, isto reenviava um rascunho de cada vez — para uma Loja com muitos irmãos, a soma
  // dos round-trips ao Wix podia estourar os 300s de maxDuration e derrubar a função no meio,
  // sem resposta nenhuma para o operador (mesmo com o que já tinha sido restaurado até ali já
  // gravado). Restaurar vários rascunhos ao mesmo tempo, em vez de um por um, encurta o tempo
  // total na mesma proporção do paralelismo, sem disparar todos de uma vez contra o Wix.
  const RESTORE_CONCURRENCY = 8;
  const receiptCode = receipt.code as string; // narrowed above; re-bound so the closure below doesn't lose it
  type DraftOutcome =
    | { uid: string; status: 'restored' | 'skipped' }
    | { uid: string; status: 'failed'; error: string };
  async function restoreDraft(entry: (typeof draftEntries)[number]): Promise<DraftOutcome> {
    const draftRef = db
      .collection('criptaOnlineDraftsV1')
      .doc(tenantId)
      .collection('users')
      .doc(entry.uid);
    try {
      if ((await draftRef.get()).exists) return { uid: entry.uid, status: 'skipped' };
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
        restoredFrom: receiptCode,
      });
      return { uid: entry.uid, status: 'restored' };
    } catch (error) {
      return {
        uid: entry.uid,
        status: 'failed',
        error: error instanceof Error ? error.message : 'falha',
      };
    }
  }
  async function restoreDraftsConcurrently(): Promise<DraftOutcome[]> {
    const outcomes: DraftOutcome[] = new Array(draftEntries.length);
    let next = 0;
    async function worker() {
      while (next < draftEntries.length) {
        const index = next++;
        outcomes[index] = await restoreDraft(draftEntries[index]!);
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(RESTORE_CONCURRENCY, draftEntries.length) }, worker),
    );
    return outcomes;
  }
  const outcomes = await restoreDraftsConcurrently();
  const restored = outcomes.filter((outcome) => outcome.status === 'restored').length;
  const skipped = outcomes.filter((outcome) => outcome.status === 'skipped').length;
  const failed = outcomes
    .filter(
      (outcome): outcome is { uid: string; status: 'failed'; error: string } =>
        outcome.status === 'failed',
    )
    .map((outcome) => ({ uid: outcome.uid, error: outcome.error }));
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
});
