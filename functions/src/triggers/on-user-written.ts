import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';
import { computeUserClaims } from '@vl6/domain';
import {
  getAdminAuth,
  getAdminFirestore,
  FirestoreRoleRepository,
  FirestoreUserRepository,
} from '@vl6/infra';

/**
 * Recalcula os Custom Claims (`tenantId`, `roleId`, `permissions`) sempre
 * que a conta é criada ou o `roleId` muda — docs/architecture/07-fluxo-
 * autenticacao.md §7.3 e docs/architecture/06-regras-negocio.md §6.6. Não
 * roda em toda escrita: se o `roleId` não mudou, não há nada novo para
 * propagar ao Firebase Auth.
 */
export const onUserWritten = onDocumentWritten('users/{uid}', async (event) => {
  const after = event.data?.after;
  if (!after || !after.exists) {
    return; // documento excluído (soft delete não altera este doc) — nada a fazer
  }

  const before = event.data?.before;
  const roleChanged = !before?.exists || before.data()?.roleId !== after.data()?.roleId;
  if (!roleChanged) {
    return;
  }

  const uid = event.params.uid;
  const db = getAdminFirestore();
  const userRepository = new FirestoreUserRepository(db);
  const roleRepository = new FirestoreRoleRepository(db);

  const user = await userRepository.findById(uid);
  if (!user) {
    logger.warn(`onUserWritten: usuário ${uid} não encontrado após escrita.`);
    return;
  }

  const role = await roleRepository.findById(user.roleId);
  if (!role) {
    logger.error(`onUserWritten: papel ${user.roleId} do usuário ${uid} não existe.`);
    return;
  }

  const claims = computeUserClaims(user, role);
  await getAdminAuth().setCustomUserClaims(uid, claims);
  logger.info(`Custom claims sincronizados para ${uid}: papel=${role.chave}`);
});
