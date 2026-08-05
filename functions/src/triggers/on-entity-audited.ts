import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { RecordAuditEntryUseCase, type AuditAction } from '@vl6/domain';
import {
  FirestoreAuditLogRepository,
  FirestoreIdGenerator,
  SystemClock,
  getAdminFirestore,
} from '@vl6/infra';

/**
 * Entidades de negócio auditadas automaticamente — docs/architecture/06-
 * regras-negocio.md §6.7. `auditLogs` nunca aparece aqui (evitaria um loop
 * infinito); `tenants`/`tenantBranding`/`tenantSettings` também ficam de
 * fora por enquanto (mudam raramente e por um único papel administrativo).
 */
const AUDITED_COLLECTIONS = new Set([
  'members',
  'boardTerms',
  'boardPositionAssignments',
  'committees',
  'news',
  'announcements',
  'users',
  'roles',
]);

/**
 * Trigger único com wildcard de coleção — evita registrar uma Cloud
 * Function separada para cada uma das 8 coleções auditadas. Determina a
 * ação (create/update/delete/restore) comparando o documento antes/depois;
 * IP e dispositivo não estão disponíveis neste contexto (trigger de banco,
 * não de requisição HTTP) e ficam `null` — quem precisa dessa informação
 * capturada de fato usa `RecordAuditEntryUseCase` diretamente na Server
 * Action/Route Handler, que tem acesso à requisição original.
 */
export const onEntityAudited = onDocumentWritten('{collection}/{docId}', async (event) => {
  const { collection, docId } = event.params as { collection: string; docId: string };
  if (!AUDITED_COLLECTIONS.has(collection)) return;

  const before = event.data?.before;
  const after = event.data?.after;
  const beforeData = before?.exists ? before.data() : null;
  const afterData = after?.exists ? after.data() : null;
  if (!beforeData && !afterData) return;

  const acao = determineAction(beforeData, afterData);
  const tenantId = (afterData?.tenantId ?? beforeData?.tenantId) as string | undefined;
  const usuarioId = (afterData?.updatedBy ?? beforeData?.updatedBy ?? 'system') as string;
  if (!tenantId) {
    logger.warn(`onEntityAudited: ${collection}/${docId} sem tenantId, ignorando.`);
    return;
  }

  const db = getAdminFirestore();
  const useCase = new RecordAuditEntryUseCase({
    auditLogRepository: new FirestoreAuditLogRepository(db),
    clock: new SystemClock(),
    idGenerator: new FirestoreIdGenerator(db),
  });

  await useCase.execute({
    tenantId,
    entidade: collection,
    entidadeId: docId,
    acao,
    usuarioId,
    ip: null,
    dispositivo: null,
    valorAnterior: beforeData ?? null,
    valorNovo: afterData ?? null,
  });
});

function determineAction(
  before: FirebaseFirestore.DocumentData | null | undefined,
  after: FirebaseFirestore.DocumentData | null | undefined,
): AuditAction {
  if (!before) return 'create';
  if (!after) return 'create'; // soft delete nunca remove o doc; sem `after` não deveria acontecer aqui

  const wasDeleted = before.deletedAt !== null && before.deletedAt !== undefined;
  const isDeleted = after.deletedAt !== null && after.deletedAt !== undefined;
  if (!wasDeleted && isDeleted) return 'delete';
  if (wasDeleted && !isDeleted) return 'restore';
  return 'update';
}
