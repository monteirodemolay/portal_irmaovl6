import type { Role } from '@vl6/domain';

/**
 * Papel de fábrica `admin`/`super_admin`/`bibliotecario`, ou papel
 * customizado com alguma permissão além de leitura. Usado tanto pro gate de
 * `/admin/*` quanto pra decidir se a seção "Administração" aparece na
 * sidebar — nunca escondida só por CSS. `bibliotecario` entra nesta lista
 * (ao contrário de `paramaconica`/`membro`) porque, apesar de sistêmico,
 * tem uma permissão de escrita de verdade (`libraryItem:manage`) e precisa
 * mesmo do painel administrativo. Isso sozinho NÃO restringe a quê dentro
 * do `/admin` ele chega — ver `isAdminPathAllowed` logo abaixo, que fecha
 * essa outra metade do problema.
 */
export function isAdminTier(role: Role | null): boolean {
  if (!role) return false;
  if (role.sistemico) return ['admin', 'super_admin', 'bibliotecario'].includes(role.chave);
  return role.permissoes.some((permission) => !permission.endsWith(':read'));
}

/**
 * Papéis "administrativos restritos" (sistêmicos, mas fora de
 * `admin`/`super_admin`) só podem entrar nos prefixos de `/admin` listados
 * aqui — o resto do painel devolve 404 pra eles mesmo sendo admin-tier.
 *
 * Por quê isso não pode ficar só a cargo do `requirePagePermission` de cada
 * página, como o resto do RBAC: o Bibliotecário carrega todas as permissões
 * de leitura de `membro` (pra funcionar como Irmão normal no Portal — ver
 * `DEFAULT_ROLE_PERMISSIONS.bibliotecario`), e essas MESMAS chaves
 * (`member:read`, `boardTerm:read`, `event:read`, `announcement:read`,
 * `news:read`...) são o que destrava as seções "Pessoas & Loja" e
 * "Conteúdo" do painel administrativo (nav-items.tsx) — não dá pra tirar
 * essas permissões sem quebrar o Portal dele. Por isso o gate por caminho
 * aqui, além do gate por permissão de cada página.
 */
// Só os PREFIXOS DE SUBÁRVORE — nunca `/admin` puro aqui: como o teste
// abaixo usa `startsWith(prefix + '/')`, incluir `/admin` na lista liberaria
// literalmente qualquer rota administrativa (toda rota começa com
// `/admin/`), anulando a própria restrição. A raiz `/admin` (o dashboard)
// é tratada à parte, como igualdade exata, dentro da função.
const RESTRICTED_ADMIN_SUBTREES: Partial<Record<string, string[]>> = {
  bibliotecario: ['/admin/acervo', '/admin/configuracoes'],
};

export function isAdminPathAllowed(role: Role | null, pathname: string): boolean {
  if (!role) return false;
  const subtrees = role.sistemico ? RESTRICTED_ADMIN_SUBTREES[role.chave] : undefined;
  if (!subtrees) return true;
  if (pathname === '/admin') return true;
  return subtrees.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
