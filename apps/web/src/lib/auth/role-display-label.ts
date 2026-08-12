import type { Role } from '@vl6/domain';

/**
 * Rótulo do papel pra exibição (topbar, hero) — nunca hardcoded na tela.
 * Papel de fábrica tem rótulo fixo; papel customizado usa o próprio `nome`
 * cadastrado pela Loja.
 */
export function roleDisplayLabel(role: Role | null): string {
  if (!role) return 'Irmão';
  if (role.sistemico) {
    switch (role.chave) {
      case 'super_admin':
        return 'Administrador Geral';
      case 'admin':
        return 'Administrador da Loja';
      default:
        return 'Membro';
    }
  }
  return role.nome;
}
