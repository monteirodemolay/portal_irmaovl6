import type { Role } from '@vl6/domain';

/**
 * Papel de fábrica `admin`/`super_admin`/`bibliotecario`, ou papel
 * customizado com alguma permissão além de leitura. Usado tanto pro gate de
 * `/admin/*` quanto pra decidir se a seção "Administração" aparece na
 * sidebar — nunca escondida só por CSS. `bibliotecario` entra nesta lista
 * (ao contrário de `paramaconica`/`membro`) porque, apesar de sistêmico,
 * tem uma permissão de escrita de verdade (`libraryItem:manage`) e precisa
 * mesmo do painel administrativo — só que restrito à Biblioteca, que é
 * quem decide o que aparece dentro do `/admin` (mesma regra de qualquer
 * outro papel: cada rota interna ainda faz o próprio `requirePagePermission`).
 */
export function isAdminTier(role: Role | null): boolean {
  if (!role) return false;
  if (role.sistemico)
    return ['admin', 'super_admin', 'bibliotecario'].includes(role.chave);
  return role.permissoes.some((permission) => !permission.endsWith(':read'));
}
