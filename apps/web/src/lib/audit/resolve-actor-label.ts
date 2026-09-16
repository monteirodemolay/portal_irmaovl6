import type { createServerContainer } from '@vl6/infra';

/**
 * `AuditLog.usuarioId` é só um uid/marcador técnico ("self-claim" no fluxo
 * público de "Reivindicar meu cadastro", por exemplo) — resolve pro nome do
 * Irmão quando existe, senão cai pro e-mail da conta, senão pro próprio
 * identificador bruto. Só usado nas telas de auditoria (poucas dezenas de
 * linhas por página), nunca em volume.
 */
export async function resolveActorLabel(
  container: ReturnType<typeof createServerContainer>,
  usuarioId: string,
): Promise<string> {
  if (usuarioId === 'self-claim') return 'Autoatendimento (Reivindicar meu cadastro)';

  const user = await container.repositories.user.findById(usuarioId).catch(() => null);
  if (!user) return usuarioId;
  if (!user.memberId) return user.email;

  const member = await container.repositories.member.findById(user.memberId);
  return member?.nomeCompleto ?? user.email;
}
