import type { Member } from '@vl6/domain';

/**
 * Nome de exibição do usuário logado — usado no topbar e no cartão de
 * perfil do hero (nunca hardcoded). Sem `Member` vinculado (ex.:
 * Administrador Geral, que não tem cadastro de Irmão), cai pro e-mail da
 * conta.
 */
export function resolveMemberDisplayName(member: Member | null, fallbackEmail: string): string {
  return member?.nomeCompleto ?? fallbackEmail;
}
