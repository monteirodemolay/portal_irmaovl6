import type { Role } from '@vl6/domain';
import type { AccessLevel } from '@vl6/shared';
import { isAdminTier } from '../../../lib/auth/is-admin-tier';

/**
 * Decide se um `AccessLevel` (`ArchiveItem.nivelAcesso`/`ArchiveMedia.
 * accessLevel`, docs/architecture/11-acervo-vl6.md §11.5) é visível para a
 * sessão atual — usado pela experiência pública do Acervo VL6
 * (`/acervo/eventos/[eventId]`, Fase 4). Não existia lógica equivalente no
 * projeto antes desta fase; mantido simples de propósito, num único lugar,
 * em vez de duplicar a regra em cada tela que lista `ArchiveMedia`.
 *
 * Hierarquia: `administracao` > `membros_loja` > `irmaos` > `publico`.
 * Este portal é o portal próprio de uma única Loja (não há hoje sessão de
 * "Irmão visitante" de outro tenant) — por isso qualquer sessão autenticada
 * já conta como "membro da loja" e enxerga tanto `irmaos` quanto
 * `membros_loja`; só `administracao` exige o mesmo critério já usado em
 * `isAdminTier` (papel de fábrica admin/super_admin, ou papel customizado
 * com alguma permissão além de leitura).
 */
export function isAccessLevelVisible(
  level: AccessLevel,
  session: { authenticated: boolean; role: Role | null },
): boolean {
  if (level === 'publico') return true;
  if (!session.authenticated) return false;
  if (level === 'administracao') return isAdminTier(session.role);
  return true;
}
