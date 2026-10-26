import type { AuthContext, Role } from '@vl6/domain';
import type { PermissionKey } from '@vl6/shared';
import { canAccessAdminHref, visibleUploadDestinations } from './admin-workspace';

export interface QuickAddOption {
  key: 'acontecimento' | 'aviso' | 'noticia' | 'arquivos';
  title: string;
  /** Uma linha, com exemplos concretos. */
  hint: string;
  href: string;
}

interface Candidate extends QuickAddOption {
  permissions: PermissionKey[];
  /** Caminho usado no controle de acesso administrativo por papel. */
  gatePath: string;
}

const CANDIDATES: Candidate[] = [
  {
    key: 'acontecimento',
    title: 'Acontecimento',
    hint: 'Sessão, evento, palestra ou confraternização',
    href: '/admin/publicacoes/novo',
    permissions: ['event:create', 'event:read'],
    gatePath: '/admin/publicacoes/novo',
  },
  {
    key: 'aviso',
    title: 'Aviso',
    hint: 'Vincular a um acontecimento ou criar recado avulso',
    href: '/admin/publicacoes/preparar?conteudo=aviso',
    permissions: ['announcement:create'],
    gatePath: '/admin/conteudo/avisos',
  },
  {
    key: 'noticia',
    title: 'Notícia',
    hint: 'Localizar o acontecimento e completar sua notícia',
    href: '/admin/publicacoes/preparar?conteudo=noticia',
    permissions: ['news:create', 'event:read'],
    gatePath: '/admin/conteudo/noticias',
  },
];

/**
 * Atalhos de "o que você quer adicionar?" da Central. Só aparece o que o
 * perfil pode de fato criar; cada destino segue com seu próprio controle de
 * acesso no servidor.
 */
export function buildQuickAdd(ctx: AuthContext, role: Role | null): QuickAddOption[] {
  const options: QuickAddOption[] = CANDIDATES.filter((c) =>
    c.permissions.every((permission) =>
      canAccessAdminHref(c.gatePath, [permission], ctx, role),
    ) && canAccessAdminHref(c.href.split('?')[0], [], ctx, role),
  ).map(({ key, title, hint, href }) => ({ key, title, hint, href }));
  if (visibleUploadDestinations(ctx, role).length > 0) {
    options.push({
      key: 'arquivos',
      title: 'Foto, vídeo ou documento',
      hint: 'Enviar arquivos para o Acervo ou a Biblioteca',
      href: '/admin/enviar',
    });
  }
  return options;
}
