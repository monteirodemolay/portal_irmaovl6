import { NextResponse, type NextRequest } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { logger } from '@vl6/shared';
import { getAdminFirestore, putBackupBlob } from '@vl6/infra';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { requireCronSecret } from '@/lib/api/require-cron-secret';

const ROUTE = 'GET /api/cron/daily-backup';

// Todas as coleções de dados do app — docs/architecture/03-modelo-dados.md.
// `auditLogs` entra também: é o próprio histórico, vale a pena ter no backup.
const COLLECTIONS = [
  'tenants',
  'tenantBranding',
  'tenantSettings',
  'users',
  'roles',
  'members',
  'memberPositionHistory',
  'boardTerms',
  'boardPositionAssignments',
  'committees',
  'fileCategories',
  'files',
  'libraryCategories',
  'libraryItems',
  'libraryFavorites',
  'events',
  'eventAttendance',
  'news',
  'newsComments',
  'announcements',
  'galleryAlbums',
  'galleryMedia',
  'auditLogs',
  'notifications',
  'notificationPreferences',
  'publicPages',
  'links',
];

/** Converte `Timestamp` do Firestore (não serializável por JSON.stringify) em ISO string, recursivamente. */
function toJsonSafe(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toJsonSafe(v)]),
    );
  }
  return value;
}

/**
 * Export diário completo do Firestore (todas as coleções, todos os
 * tenants) para o Vercel Blob — substitui a Cloud Function `dailyBackup`
 * (Managed Export do Firestore para Cloud Storage), que exige plano Blaze
 * mesmo só para o bucket de destino, o mesmo problema que já tiramos o
 * Storage do caminho. Um blob JSON por coleção, sob `backups/{data}/`.
 *
 * Usa `putBackupBlob` (não `VercelBlobStorageAdapter`, que fixa
 * `addRandomSuffix: false` para paths públicos estáveis — o oposto do que
 * backup precisa, ver comentário lá). A resposta desta rota nunca expõe a
 * URL do blob a um client, só a contagem por coleção.
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const db = getAdminFirestore();
  const today = new Date().toISOString().slice(0, 10);
  const resultado: Record<string, number> = {};

  for (const collectionName of COLLECTIONS) {
    const snap = await db.collection(collectionName).get();
    const docs = snap.docs.map((doc) => ({ id: doc.id, ...(toJsonSafe(doc.data()) as object) }));

    await putBackupBlob(`backups/${today}/${collectionName}.json`, JSON.stringify(docs));
    resultado[collectionName] = docs.length;
  }

  logger.info('dailyBackup: concluído', { route: ROUTE, colecoes: COLLECTIONS.length });
  return NextResponse.json({ data: today, colecoes: resultado });
});
