import type { PermissionKey } from '@vl6/shared';

export interface AreaTabDef {
  href: string;
  label: string;
  /** `null` = visível a qualquer sessão admin (ex.: Configurações gerais). */
  permission: PermissionKey | null;
}

export type AdminAreaKey = 'pessoas' | 'conteudo' | 'acervo' | 'configuracoes';

/**
 * Fonte única de verdade das abas de cada grande área administrativa —
 * consumida pelo `AreaTabNav` (barra de abas) e pelos `page.tsx` de índice
 * de área (redirect pra primeira aba visível). A permissão listada aqui é a
 * MESMA que cada `page.tsx` de aba exige via `requirePagePermission` — a
 * barra só decide o que mostrar, a proteção real continua server-side na
 * própria rota da aba.
 */
export const ADMIN_AREA_TABS: Record<AdminAreaKey, AreaTabDef[]> = {
  pessoas: [
    { href: '/admin/pessoas/irmaos', label: 'Irmãos', permission: 'member:read' },
    { href: '/admin/pessoas/gestoes', label: 'Gestões', permission: 'boardTerm:read' },
    { href: '/admin/pessoas/usuarios', label: 'Usuários', permission: 'user:read' },
    { href: '/admin/pessoas/permissoes', label: 'Permissões', permission: 'role:read' },
    { href: '/admin/pessoas/loja', label: 'Loja', permission: 'branding:read' },
    { href: '/admin/pessoas/central', label: 'Central VL6', permission: 'memberCentral:manage' },
    {
      href: '/admin/pessoas/negocios',
      label: 'Negócios & Serviços',
      permission: 'memberCentral:manage',
    },
  ],
  conteudo: [
    { href: '/admin/conteudo/avisos', label: 'Avisos', permission: 'announcement:read' },
    { href: '/admin/conteudo/agenda', label: 'Agenda', permission: 'event:read' },
    { href: '/admin/conteudo/noticias', label: 'Notícias', permission: 'news:read' },
    { href: '/admin/conteudo/frases', label: 'Frases', permission: 'quote:read' },
  ],
  acervo: [
    {
      href: '/admin/acervo/publicar',
      label: 'Publicar',
      permission: 'archiveItem:create',
    },
    { href: '/admin/acervo/arquivos', label: 'Documentos', permission: 'file:read' },
    { href: '/admin/acervo/biblioteca', label: 'Biblioteca', permission: 'libraryItem:read' },
    { href: '/admin/acervo/galeria', label: 'Fotografias', permission: 'gallery:read' },
    {
      href: '/admin/acervo/colecoes',
      label: 'Coleções',
      permission: 'archiveCollection:read',
    },
    {
      href: '/admin/acervo/relacoes',
      label: 'Relações',
      permission: 'archiveRelation:read',
    },
    {
      href: '/admin/acervo/exposicoes',
      label: 'Exposições',
      permission: 'archiveExhibition:read',
    },
    {
      href: '/admin/acervo/catalogacao',
      label: 'Catalogação',
      permission: 'archiveCatalog:read',
    },
    {
      href: '/admin/acervo/contribuicoes',
      label: 'Contribuições',
      permission: 'archiveContribution:manage',
    },
    {
      href: '/admin/acervo/lixeira',
      label: 'Lixeira',
      permission: 'archiveItem:delete',
    },
    {
      href: '/admin/acervo/migracao',
      label: 'Migração',
      permission: 'archiveItem:create',
    },
    {
      href: '/admin/acervo/duplicidade',
      label: 'Duplicidade',
      permission: 'archiveMedia:manage',
    },
    {
      href: '/admin/acervo/metricas',
      label: 'Métricas',
      permission: 'archiveMedia:manage',
    },
  ],
  configuracoes: [
    { href: '/admin/configuracoes/geral', label: 'Geral', permission: null },
    { href: '/admin/configuracoes/integracoes', label: 'Integrações', permission: 'tenant:manage' },
  ],
};
