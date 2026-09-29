/**
 * Migração pontual de local dos eventos da Loja VL6.
 *
 * Uso (com credenciais Firebase Admin configuradas no ambiente):
 *   TENANT_ID=<tenant-id> pnpm --filter @vl6/scripts exec tsx normalize-temple-location.ts
 *   TENANT_ID=<tenant-id> pnpm --filter @vl6/scripts exec tsx normalize-temple-location.ts --apply
 *
 * Por padrão, somente audita e apresenta as quantidades. Com --apply, altera
 * APENAS events.local dos documentos do tenant indicado, em lotes de até 400.
 * Inclui inclusive os registros arquivados/excluídos do tenant. Não altera datas,
 * títulos, mídia, outros campos nem documentos de outras Lojas.
 * Pode ser executado repetidas vezes sem alterar registros já normalizados.
 */
import { getAdminFirestore } from '@vl6/infra';
import { normalizeEventLocation, VL6_TEMPLE_LOCATION } from '@vl6/shared';

async function main(): Promise<void> {
  const tenantId = process.env.TENANT_ID?.trim();
  if (!tenantId)
    throw new Error('Defina TENANT_ID explicitamente para evitar alterações entre Lojas.');

  const apply = process.argv.includes('--apply');
  const db = getAdminFirestore();
  const collection = db.collection('events');
  const pageSize = 400;
  let lastId: string | null = null;
  let scanned = 0;
  let candidates = 0;
  let updated = 0;

  while (true) {
    let query = collection.where('tenantId', '==', tenantId).orderBy('__name__').limit(pageSize);
    if (lastId) query = query.startAfter(lastId);
    const snap = await query.get();
    if (snap.empty) break;
    const batch = db.batch();
    let batchChanges = 0;

    for (const doc of snap.docs) {
      scanned++;
      const data = doc.data();
      if (typeof data.local !== 'string') continue;
      const next = normalizeEventLocation(data.local);
      if (next === data.local) continue;
      candidates++;
      if (apply) {
        batch.update(doc.ref, { local: VL6_TEMPLE_LOCATION });
        batchChanges++;
      }
    }
    if (apply && batchChanges > 0) {
      await batch.commit();
      updated += batchChanges;
    }
    lastId = snap.docs.at(-1)?.id ?? null;
    if (snap.size < pageSize) break;
  }

  console.log(
    JSON.stringify(
      {
        tenantId,
        mode: apply ? 'APPLY' : 'DRY_RUN',
        scanned,
        candidates,
        updated,
        newLocation: VL6_TEMPLE_LOCATION,
      },
      null,
      2,
    ),
  );
  if (!apply)
    console.log('Somente auditoria. Execute novamente com --apply para persistir as alterações.');
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
