import { getAdminFirestore } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { sealRef, currentInventory } from '@/modules/cripta/lib/seal-state';
import { receiptDigest } from '@/modules/cripta/lib/seal-manifest';
import { downloadPrivateCiphertext } from '@/modules/cripta/lib/wix-private-files';
import { buildLacreFile, encodeEntries, type LacreEntry } from '@/modules/cripta/lib/lacre-format';

export const runtime = 'nodejs';
export const maxDuration = 300;

/** Produces the single CRIPTA/2 file meant to be copied, unchanged, onto every physical unit.
 * Only callable right after a lacração, and only while the inventory still matches the sealed
 * receipt exactly — if anything moved since sealing, this refuses rather than export a
 * mismatched file. Downloads every ciphertext from Wix; for a very large inventory this holds
 * everything in memory before responding, which is fine at pilot scale but should become a true
 * stream before this serves a full Loja. */
export async function GET() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email))
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  const tenantId = session.authContext.tenantId;
  const receipt = (await sealRef(tenantId).get()).data();
  if (!receipt || receipt.status !== 'sealed') {
    return NextResponse.json(
      { error: 'Só é possível exportar logo após uma lacração vigente.' },
      { status: 409 },
    );
  }
  if (receiptDigest(receipt as Parameters<typeof receiptDigest>[0]) !== receipt.receiptDigest) {
    return NextResponse.json(
      { error: 'O recibo de lacração não confere. Não exporte antes de apurar.' },
      { status: 409 },
    );
  }
  const db = getAdminFirestore();
  const [letters, drafts, actual] = await Promise.all([
    db.collection('criptaOnlineCapsulesV1').get(),
    db.collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').get(),
    currentInventory(tenantId),
  ]);
  if (actual.digest !== receipt.inventoryDigest || actual.count !== receipt.count) {
    return NextResponse.json(
      {
        error:
          'O inventário mudou desde a lacração. Audite antes de exportar; não use este arquivo.',
      },
      { status: 409 },
    );
  }
  try {
    const letterEntries: LacreEntry[] = [];
    for (const doc of letters.docs) {
      const data = doc.data();
      if (data.tenantId !== tenantId || data.status !== 'ready') continue;
      const bytes = await downloadPrivateCiphertext(data.fileId as string, data.sha256 as string);
      letterEntries.push({
        kind: 'letter',
        id: doc.id,
        uid: data.uid as string,
        sha256: data.sha256 as string,
        bytes,
      });
    }
    const draftEntries: LacreEntry[] = [];
    for (const doc of drafts.docs) {
      const data = doc.data();
      const bytes = await downloadPrivateCiphertext(data.fileId as string, data.sha256 as string);
      draftEntries.push({
        kind: 'draft',
        id: doc.id,
        uid: doc.id,
        sha256: data.sha256 as string,
        bytes,
      });
    }
    const payload = encodeEntries([...letterEntries, ...draftEntries]);
    const file = buildLacreFile(
      {
        formato: 'CRIPTA/2',
        codigoLacracao: receipt.code as string,
        inventoryDigest: receipt.inventoryDigest as string,
        totalCartas: receipt.letters as number,
      },
      payload,
    );
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${receipt.code}.lacre"`,
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Não foi possível montar o arquivo de exportação. Nada foi alterado no Wix.' },
      { status: 502 },
    );
  }
}
