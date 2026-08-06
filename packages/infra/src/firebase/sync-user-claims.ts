import { computeUserClaims, type Role, type User } from '@vl6/domain';
import { getAdminAuth } from './admin-app';

/**
 * Grava os Custom Claims (`tenantId`, `roleId`, `permissions`) no Firebase
 * Auth a partir do `User`/`Role` atuais — docs/architecture/07 §7.3. Sem
 * Cloud Functions implantadas (plano Spark), não existe mais um trigger
 * `onUserWritten` fazendo isso automaticamente; todo caminho de escrita que
 * cria uma conta ou muda `roleId` precisa chamar isto explicitamente logo
 * em seguida.
 */
export async function syncUserClaims(user: User, role: Role): Promise<void> {
  await getAdminAuth().setCustomUserClaims(user.id, computeUserClaims(user, role));
}
