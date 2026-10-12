import type { PermissionKey } from '@vl6/shared';

/**
 * Áreas de trabalho da Central de Administração. Cada área tem uma casca
 * própria (`AdminWorkspaceShell`) com abas de rotina e um painel "Mais nesta
 * área"; o que é de uso eventual vai para `/admin/avancado`.
 */
export type AdminWorkspaceArea =
  | 'acontecimentos'
  | 'pessoas'
  | 'acervo'
  | 'conhecimento'
  | 'cripta'
  | 'sistema';

/**
 * - `rotina`: operação do dia a dia; aparece como aba (`tab`) ou em
 *   "Mais nesta área" dentro da própria área.
 * - `avancado`: migração, reconciliação, conferência, lixeira, diagnóstico,
 *   ensaio ou configuração do sistema; aparece em `/admin/avancado`.
 */
export type AdminToolTier = 'rotina' | 'avancado';

export type AdminAdvancedSection =
  | 'Migrações e reconciliações'
  | 'Conferências e saneamento'
  | 'Lixeiras'
  | 'Diagnóstico'
  | 'Ensaios da Cripta'
  | 'Sistema';

export interface AdminTool {
  href: string;
  label: string;
  /** Agrupamento usado pelo diretório de busca da Central de Controle. */
  group: string;
  /** Basta uma. Lista vazia = qualquer sessão administrativa. */
  permissions: PermissionKey[];
  area: AdminWorkspaceArea;
  tier: AdminToolTier;
  /** Aparece como aba na casca da área (na ordem deste arquivo). */
  tab?: boolean;
  /** Aba só fica ativa na URL exata (para não "engolir" as subrotas). */
  exact?: boolean;
  description?: string;
  /** Obrigatório quando `tier === 'avancado'`. */
  section?: AdminAdvancedSection;
}

export interface AdminAreaInfo {
  key: AdminWorkspaceArea;
  title: string;
  description: string;
}

export const ADMIN_AREAS: Record<AdminWorkspaceArea, AdminAreaInfo> = {
  acontecimentos: {
    key: 'acontecimentos',
    title: 'Acontecimentos',
    description:
      'O acontecimento é cadastrado uma vez; aviso, notícia, comunicação, presença e Acervo ficam vinculados a ele.',
  },
  pessoas: {
    key: 'pessoas',
    title: 'Pessoas e Loja',
    description:
      'Cada Irmão é um cadastro único, reutilizado em acesso, Diretório, Negócios, Conhecimento, Cripta e eventos.',
  },
  acervo: {
    key: 'acervo',
    title: 'Acervo e Biblioteca',
    description:
      'Inserir, acompanhar e preservar a memória da Loja e operar a circulação da Biblioteca.',
  },
  conhecimento: {
    key: 'conhecimento',
    title: 'Conhecimento',
    description: 'Conteúdos de instrução, revisões e relatórios autorizados.',
  },
  cripta: {
    key: 'cripta',
    title: 'Cripta',
    description: 'Cápsulas do tempo: ciclo da cerimônia, projeção e entregas.',
  },
  sistema: {
    key: 'sistema',
    title: 'Sistema',
    description: 'Parâmetros, integrações, auditoria, documentos legais e manutenção.',
  },
};

const EDITORIAL_READ: PermissionKey[] = [
  'event:read',
  'announcement:read',
  'news:read',
  'communication:manage',
  'archiveItem:create',
];

/**
 * Fonte única das telas administrativas. A ordem dentro de cada área é a
 * ordem das abas. O teste `admin-tool-directory.test.ts` garante que toda
 * `page.tsx` estática de `/admin` está aqui (ou é tela de criação/redirect
 * listada abaixo) — nenhuma tela fica sem entrada.
 *
 * Apenas destinos de ferramentas: nunca indexa registros pessoais, cartas ou segredos.
 */
export const ADMIN_TOOLS: AdminTool[] = [
  // ── Acontecimentos ─────────────────────────────────────────────────────
  {
    href: '/admin/publicacoes',
    label: 'Acontecimentos',
    description: 'Ficha Única de cada fato, com tudo o que deriva dele.',
    group: 'Publicações e Agenda',
    permissions: EDITORIAL_READ,
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
    exact: true,
  },
  {
    href: '/admin/publicacoes/novo',
    label: 'Registrar acontecimento',
    description: 'Cadastre o fato uma única vez.',
    group: 'Publicações e Agenda',
    permissions: ['event:create'],
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
    exact: true,
  },
  {
    href: '/admin/conteudo/agenda',
    label: 'Calendário e presença',
    description: 'Visão cronológica e controle de presença.',
    group: 'Publicações e Agenda',
    permissions: ['event:read'],
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/conteudo/avisos',
    label: 'Avisos',
    description: 'Comunicados aos Irmãos.',
    group: 'Publicações e Agenda',
    permissions: ['announcement:read'],
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/conteudo/noticias',
    label: 'Notícias',
    description: 'Textos editoriais vinculados ao acontecimento.',
    group: 'Publicações e Agenda',
    permissions: ['news:read'],
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/comunicacao',
    label: 'Comunicação',
    description: 'Fila de artes e publicações.',
    group: 'Publicações e Agenda',
    permissions: ['communication:manage'],
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/comunicacao/modelos',
    label: 'Modelos e artes',
    description: 'Modelos visuais de comunicação.',
    group: 'Publicações e Agenda',
    permissions: ['communication:manage'],
    area: 'acontecimentos',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/conteudo/frases',
    label: 'Frases',
    description: 'Frases exibidas no Portal.',
    group: 'Publicações e Agenda',
    permissions: ['quote:read'],
    area: 'acontecimentos',
    tier: 'rotina',
  },
  {
    href: '/admin/conteudo/links',
    label: 'Links úteis',
    description: 'Atalhos externos publicados aos Irmãos.',
    group: 'Publicações e Agenda',
    permissions: ['link:read'],
    area: 'acontecimentos',
    tier: 'rotina',
  },
  {
    href: '/admin/conteudo/notificacoes/nova',
    label: 'Notificação pessoal',
    description: 'Mensagem direta a um Irmão.',
    group: 'Publicações e Agenda',
    permissions: ['notification:manage'],
    area: 'acontecimentos',
    tier: 'rotina',
  },
  {
    href: '/admin/conteudo/noticias/comentarios',
    label: 'Moderação de comentários',
    description: 'Comentários das notícias.',
    group: 'Publicações e Agenda',
    permissions: ['news:manage'],
    area: 'acontecimentos',
    tier: 'rotina',
  },
  {
    href: '/admin/conteudo/agenda/revisao',
    label: 'Revisão de sessões',
    description: 'Sessões com dados incompletos.',
    group: 'Publicações e Agenda',
    permissions: ['event:manage'],
    area: 'acontecimentos',
    tier: 'avancado',
    section: 'Conferências e saneamento',
  },
  {
    href: '/admin/conteudo/agenda/classificacao-migracao',
    label: 'Migração de classificação de sessões',
    description: 'Reclassificação de sessões antigas.',
    group: 'Manutenção',
    permissions: ['event:manage'],
    area: 'acontecimentos',
    tier: 'avancado',
    section: 'Migrações e reconciliações',
  },

  // ── Pessoas e Loja ─────────────────────────────────────────────────────
  {
    href: '/admin/pessoas/irmaos',
    label: 'Irmãos',
    description: 'Lista e ficha única de cada Irmão.',
    group: 'Pessoas e Loja',
    permissions: ['member:read'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/gestoes',
    label: 'Gestões',
    description: 'Gestões e nominatas.',
    group: 'Pessoas e Loja',
    permissions: ['boardTerm:read'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/paramaconicas',
    label: 'Paramaçônicas',
    description: 'Entidades paramaçônicas e seus membros.',
    group: 'Pessoas e Loja',
    permissions: ['paramasonicEntity:read'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/loja',
    label: 'Loja',
    description: 'Identidade e dados institucionais.',
    group: 'Pessoas e Loja',
    permissions: ['branding:read'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/central',
    label: 'Central VL6',
    description: 'Perfis da Central dos Irmãos.',
    group: 'Pessoas e Loja',
    permissions: ['memberCentral:manage'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/negocios',
    label: 'Negócios',
    description: 'Negócios e serviços dos Irmãos.',
    group: 'Pessoas e Loja',
    permissions: ['memberCentral:manage'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/usuarios',
    label: 'Acessos',
    description: 'Contas de login.',
    group: 'Pessoas e Loja',
    permissions: ['user:read'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/permissoes',
    label: 'Permissões',
    description: 'Papéis e permissões.',
    group: 'Pessoas e Loja',
    permissions: ['role:read'],
    area: 'pessoas',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/pessoas/irmaos/relatorio',
    label: 'Relatório de Irmãos',
    description: 'Listagens para impressão e exportação.',
    group: 'Pessoas e Loja',
    permissions: ['member:read'],
    area: 'pessoas',
    tier: 'rotina',
  },
  {
    href: '/admin/pessoas/irmaos/duplicados',
    label: 'Revisão de Irmãos duplicados',
    description: 'Unificar cadastros repetidos.',
    group: 'Pessoas e Loja',
    permissions: ['member:manage'],
    area: 'pessoas',
    tier: 'avancado',
    section: 'Conferências e saneamento',
  },
  {
    href: '/admin/pessoas/irmaos/reconciliar-ativos',
    label: 'Reconciliação de Irmãos ativos',
    description: 'Conferir quem está ativo.',
    group: 'Manutenção',
    permissions: ['member:manage'],
    area: 'pessoas',
    tier: 'avancado',
    section: 'Conferências e saneamento',
  },
  {
    href: '/admin/pessoas/situacao-migracao',
    label: 'Migração de situação maçônica',
    description: 'Histórico de situação dos Irmãos.',
    group: 'Manutenção',
    permissions: ['member:manage'],
    area: 'pessoas',
    tier: 'avancado',
    section: 'Migrações e reconciliações',
  },

  // ── Acervo e Biblioteca ────────────────────────────────────────────────
  {
    href: '/admin/acervo',
    label: 'Visão geral',
    description: 'Painel do Acervo.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveItem:read'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
    exact: true,
  },
  {
    href: '/admin/acervo/publicar',
    label: 'Publicar',
    description: 'Enviar mídias e documentos de um acontecimento.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveItem:create'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/acervo/biblioteca',
    label: 'Biblioteca',
    description: 'Catálogo da Biblioteca.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:read'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/acervo/catalogacao',
    label: 'Catalogação',
    description: 'Fichas de catalogação.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveCatalog:read'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/acervo/colecoes',
    label: 'Coleções',
    description: 'Agrupamentos temáticos.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveCollection:read'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/acervo/exposicoes',
    label: 'Exposições',
    description: 'Mostras virtuais.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveExhibition:read'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/acervo/contribuicoes',
    label: 'Contribuições',
    description: 'Envios dos Irmãos para revisar.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveContribution:manage'],
    area: 'acervo',
    tier: 'rotina',
    tab: true,
  },
  {
    href: '/admin/acervo/relacoes',
    label: 'Relações do Acervo',
    description: 'Ligações entre itens e pessoas.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveRelation:read'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/arquivos',
    label: 'Documentos',
    description: 'Documentos institucionais.',
    group: 'Acervo e Biblioteca',
    permissions: ['file:read'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/galeria',
    label: 'Fotografias e vídeos',
    description: 'Álbuns da galeria.',
    group: 'Acervo e Biblioteca',
    permissions: ['gallery:read'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/emprestimos',
    label: 'Fila de empréstimos',
    description: 'Circulação e devoluções.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/emprestimo-presencial',
    label: 'Empréstimo presencial',
    description: 'Atendimento de balcão.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/estantes',
    label: 'Estantes',
    description: 'Localização física das obras.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/etiquetas',
    label: 'Etiquetas QR',
    description: 'Impressão de etiquetas.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/baixas',
    label: 'Baixas da Biblioteca',
    description: 'Exemplares baixados.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/baixas/ocorrencias',
    label: 'Ocorrências de exemplares',
    description: 'Danos, perdas e reposições.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/biblioteca/downloads',
    label: 'Relatório de downloads',
    description: 'Obras digitais baixadas.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'rotina',
  },
  {
    href: '/admin/acervo/lixeira',
    label: 'Lixeira do Acervo',
    description: 'Restaurar itens excluídos.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveItem:delete'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Lixeiras',
  },
  {
    href: '/admin/acervo/biblioteca/lixeira',
    label: 'Lixeira da Biblioteca',
    description: 'Restaurar obras excluídas.',
    group: 'Acervo e Biblioteca',
    permissions: ['libraryItem:manage'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Lixeiras',
  },
  {
    href: '/admin/acervo/duplicidade',
    label: 'Conferência de mídias duplicadas',
    description: 'Arquivos repetidos no Acervo.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveMedia:manage'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Conferências e saneamento',
  },
  {
    href: '/admin/acervo/metricas',
    label: 'Métricas do Acervo',
    description: 'Diagnóstico e indicadores.',
    group: 'Acervo e Biblioteca',
    permissions: ['archiveMedia:manage'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Diagnóstico',
  },
  {
    href: '/admin/acervo/migracao',
    label: 'Migração do Acervo',
    description: 'Galeria e documentos legados para o Acervo.',
    group: 'Manutenção',
    permissions: ['archiveItem:create'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Migrações e reconciliações',
  },
  {
    href: '/admin/acervo/iniciacao-migracao',
    label: 'Reconciliação de iniciações',
    description: 'Vincular iniciações aos Irmãos.',
    group: 'Manutenção',
    permissions: ['member:manage'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Migrações e reconciliações',
  },
  {
    href: '/admin/acervo/elevacao-migracao',
    label: 'Reconciliação de elevações',
    description: 'Vincular elevações aos Irmãos.',
    group: 'Manutenção',
    permissions: ['member:manage'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Migrações e reconciliações',
  },
  {
    href: '/admin/acervo/exaltacao-migracao',
    label: 'Reconciliação de exaltações',
    description: 'Vincular exaltações aos Irmãos.',
    group: 'Manutenção',
    permissions: ['member:manage'],
    area: 'acervo',
    tier: 'avancado',
    section: 'Migrações e reconciliações',
  },

  // ── Conhecimento ───────────────────────────────────────────────────────
  {
    href: '/admin/conhecimento',
    label: 'Gestão do Conhecimento',
    description: 'Páginas, trilhas e materiais.',
    group: 'Conhecimento',
    permissions: ['knowledge:manage', 'tenant:manage'],
    area: 'conhecimento',
    tier: 'rotina',
    tab: true,
    exact: true,
  },
  {
    href: '/admin/conhecimento/revisoes',
    label: 'Revisões e atividades',
    description: 'Conteúdos aguardando revisão.',
    group: 'Conhecimento',
    permissions: ['knowledge:manage', 'tenant:manage'],
    area: 'conhecimento',
    tier: 'rotina',
  },
  {
    href: '/admin/conhecimento/relatorios',
    label: 'Relatórios autorizados',
    description: 'Indicadores de estudo.',
    group: 'Conhecimento',
    permissions: ['knowledge:manage', 'tenant:manage'],
    area: 'conhecimento',
    tier: 'rotina',
  },

  // ── Cripta ─────────────────────────────────────────────────────────────
  {
    href: '/admin/cripta',
    label: 'Cripta',
    description: 'Assistente do ciclo da cerimônia.',
    group: 'Cripta',
    permissions: ['tenant:manage'],
    area: 'cripta',
    tier: 'rotina',
    tab: true,
    exact: true,
  },
  {
    href: '/admin/cripta/projetor',
    label: 'Projetor e cerimônias',
    description: 'Exibição em sessão.',
    group: 'Cripta',
    permissions: ['tenant:manage'],
    area: 'cripta',
    tier: 'rotina',
  },
  {
    href: '/admin/cripta/abertura-individual',
    label: 'Abertura individual',
    description: 'Entrega a um Irmão.',
    group: 'Cripta',
    permissions: ['tenant:manage'],
    area: 'cripta',
    tier: 'rotina',
  },
  {
    href: '/admin/cripta/manutencao',
    label: 'Manutenção da Cripta',
    description: 'Renovação, restauração e limpeza.',
    group: 'Manutenção',
    permissions: ['tenant:manage'],
    area: 'cripta',
    tier: 'avancado',
    section: 'Ensaios da Cripta',
  },
  {
    href: '/admin/cripta/demonstracao',
    label: 'Demonstração da Cripta',
    description: 'Ensaio sem dados reais.',
    group: 'Manutenção',
    permissions: ['tenant:manage'],
    area: 'cripta',
    tier: 'avancado',
    section: 'Ensaios da Cripta',
  },
  {
    href: '/admin/cripta/laboratorio',
    label: 'Laboratório da Cripta',
    description: 'Conferência técnica.',
    group: 'Manutenção',
    permissions: ['tenant:manage'],
    area: 'cripta',
    tier: 'avancado',
    section: 'Ensaios da Cripta',
  },

  // ── Sistema ────────────────────────────────────────────────────────────
  {
    href: '/admin/configuracoes/geral',
    label: 'Configurações gerais',
    description: 'Dados e parâmetros do Portal.',
    group: 'Configurações e Auditoria',
    permissions: [],
    area: 'sistema',
    tier: 'avancado',
    tab: true,
    section: 'Sistema',
  },
  {
    href: '/admin/configuracoes/integracoes',
    label: 'Integrações',
    description: 'Serviços conectados.',
    group: 'Configurações e Auditoria',
    permissions: ['tenant:manage'],
    area: 'sistema',
    tier: 'avancado',
    tab: true,
    section: 'Sistema',
  },
  {
    href: '/admin/configuracoes/auditoria',
    label: 'Auditoria',
    description: 'Registro de ações administrativas.',
    group: 'Configurações e Auditoria',
    permissions: ['auditLog:read'],
    area: 'sistema',
    tier: 'avancado',
    tab: true,
    section: 'Sistema',
  },
  {
    href: '/admin/configuracoes/termos-e-privacidade',
    label: 'Termos e privacidade',
    description: 'Documentos legais e aceites.',
    group: 'Configurações e Auditoria',
    permissions: ['legalDocument:manage'],
    area: 'sistema',
    tier: 'avancado',
    tab: true,
    section: 'Sistema',
  },
  {
    href: '/admin/configuracoes/manutencao',
    label: 'Manutenção',
    description: 'Rotinas técnicas de reconciliação.',
    group: 'Configurações e Auditoria',
    permissions: [],
    area: 'sistema',
    tier: 'avancado',
    tab: true,
    section: 'Sistema',
  },
];

/**
 * Telas de criação e redirects que não precisam de entrada própria no menu:
 * são abertas a partir da tela-mãe indicada (botão "Novo…") ou apenas
 * redirecionam endereços antigos. O teste confere que a tela-mãe existe e
 * realmente aponta para a filha.
 */
export const ADMIN_CHILD_ROUTES: { href: string; parent: string }[] = [
  { href: '/admin/conteudo/agenda/novo', parent: '/admin/conteudo/agenda' },
  { href: '/admin/conteudo/avisos/novo', parent: '/admin/conteudo/avisos' },
  { href: '/admin/conteudo/noticias/nova', parent: '/admin/conteudo/noticias' },
  { href: '/admin/conteudo/frases/nova', parent: '/admin/conteudo/frases' },
  { href: '/admin/conteudo/links/novo', parent: '/admin/conteudo/links' },
  { href: '/admin/comunicacao/modelos/novo', parent: '/admin/comunicacao/modelos' },
  { href: '/admin/pessoas/irmaos/novo', parent: '/admin/pessoas/irmaos' },
  { href: '/admin/pessoas/gestoes/nova', parent: '/admin/pessoas/gestoes' },
  { href: '/admin/acervo/arquivos/novo', parent: '/admin/acervo/arquivos' },
  { href: '/admin/acervo/biblioteca/novo', parent: '/admin/acervo/biblioteca' },
  { href: '/admin/acervo/catalogacao/nova', parent: '/admin/acervo/catalogacao' },
  { href: '/admin/acervo/colecoes/novo', parent: '/admin/acervo/colecoes' },
  { href: '/admin/acervo/exposicoes/novo', parent: '/admin/acervo/exposicoes' },
  { href: '/admin/acervo/galeria/novo', parent: '/admin/acervo/galeria' },
  { href: '/admin/acervo/relacoes/nova', parent: '/admin/acervo/relacoes' },
];

/** Raízes de área e endereços antigos que só redirecionam. */
export const ADMIN_REDIRECT_ROUTES: string[] = [
  '/admin/conteudo',
  '/admin/pessoas',
  '/admin/configuracoes',
  '/admin/cripta/inauguracao',
  '/admin/cripta/lacracao',
  '/admin/cripta/reabertura',
];

/** Páginas de navegação da própria Central (menu lateral). */
export const ADMIN_HUB_ROUTES: string[] = ['/admin', '/admin/enviar', '/admin/avancado'];

export const ADMIN_ADVANCED_SECTIONS: AdminAdvancedSection[] = [
  'Migrações e reconciliações',
  'Conferências e saneamento',
  'Lixeiras',
  'Diagnóstico',
  'Ensaios da Cripta',
  'Sistema',
];

/**
 * Destinos do botão "Enviar arquivos": cada um abre o fluxo de envio que já
 * existe e grava no cadastro de origem (sem cópia paralela).
 */
export interface AdminUploadDestination {
  href: string;
  title: string;
  description: string;
  examples: string;
  permissions: PermissionKey[];
}

export const ADMIN_UPLOAD_DESTINATIONS: AdminUploadDestination[] = [
  {
    href: '/admin/acervo/publicar',
    title: 'Registros de um acontecimento',
    description: 'Fotos, vídeos, áudios e documentos de uma sessão, visita ou evento.',
    examples: 'Fotos da sessão, ata, discurso gravado',
    permissions: ['archiveItem:create'],
  },
  {
    href: '/admin/acervo/biblioteca/novo',
    title: 'Obra da Biblioteca',
    description: 'Livro físico ou digital, com capa e arquivo para download.',
    examples: 'PDF de livro, capa, material de estudo',
    permissions: ['libraryItem:create'],
  },
  {
    href: '/admin/acervo/arquivos/novo',
    title: 'Documento institucional',
    description: 'Documentos da Loja que não pertencem a um acontecimento específico.',
    examples: 'Estatuto, regimento, formulários',
    permissions: ['file:create'],
  },
];
