/**
 * Mapa "o que o Portal mostra × onde a Administração alimenta".
 *
 * Fonte única do alinhamento entre as seções que o Irmão enxerga e as telas
 * que as alimentam. O teste `portal-surfaces.test.ts` falha se uma seção
 * nova de `(member)` surgir sem entrada aqui, ou se uma entrada apontar para
 * uma ferramenta que não existe em `ADMIN_TOOLS`.
 */

export type PortalSurfaceGroup =
  | 'Início e comunicação'
  | 'Comunidade'
  | 'Acervo e memória'
  | 'Conhecimento e Cripta';

/**
 * - `manual`: só aparece no Portal depois de cadastrado na Administração.
 * - `automatico`: derivado de outro cadastro; nada a digitar.
 * - `misto`: parte vem de outro cadastro, parte é digitada.
 */
export type PortalSurfaceMode = 'manual' | 'automatico' | 'misto';

export interface PortalSurface {
  key: string;
  label: string;
  group: PortalSurfaceGroup;
  /** Rota que o Irmão abre no Portal. */
  publicHref: string;
  /** Tela da Administração que alimenta a seção (deve estar em ADMIN_TOOLS). */
  feedHref: string;
  feedLabel: string;
  mode: PortalSurfaceMode;
  /** Uma frase objetiva: o que o Portal exibe e de onde vem. */
  how: string;
  /** Chave da métrica da Central de Controle que conta o que está visível. */
  visibleMetric?: string;
  /** Contagem do que está cadastrado mas não aparece (rascunho/oculto). */
  hidden?: { metric: string } | { total: string; minus: string };
  /** Lacuna conhecida entre o que o Portal mostra e o que a Administração oferece. */
  gap?: string;
  /** Termos extras para a busca. */
  keywords?: string[];
}

export const PORTAL_SURFACES: PortalSurface[] = [
  {
    key: 'inicio',
    label: 'Início do Irmão',
    group: 'Início e comunicação',
    publicHref: '/dashboard',
    feedHref: '/admin/conteudo/frases',
    feedLabel: 'Frases',
    mode: 'misto',
    how: 'Frase do dia vem de Frases; próxima sessão, aniversários e "neste dia" saem sozinhos de Acontecimentos e Irmãos.',
    keywords: ['frase do dia', 'aniversariantes', 'neste dia', 'destaque'],
  },
  {
    key: 'agenda',
    label: 'Minha Agenda',
    group: 'Início e comunicação',
    publicHref: '/agenda',
    feedHref: '/admin/publicacoes/novo',
    feedLabel: 'Registrar acontecimento',
    mode: 'manual',
    how: 'Cada acontecimento futuro cadastrado aparece na agenda de todos os Irmãos.',
    visibleMetric: 'upcoming',
    keywords: ['sessão', 'evento', 'calendário', 'presença'],
  },
  {
    key: 'avisos',
    label: 'Notificações e avisos',
    group: 'Início e comunicação',
    publicHref: '/avisos',
    feedHref: '/admin/conteudo/avisos',
    feedLabel: 'Avisos',
    mode: 'manual',
    how: 'Avisos publicados chegam como notificação; os vinculados a um acontecimento nascem da ficha dele.',
    visibleMetric: 'announcements',
    keywords: ['notificação', 'comunicado'],
  },
  {
    key: 'noticias',
    label: 'Notícias',
    group: 'Início e comunicação',
    publicHref: '/noticias',
    feedHref: '/admin/conteudo/noticias',
    feedLabel: 'Notícias',
    mode: 'manual',
    how: 'Só notícias publicadas aparecem; rascunhos ficam visíveis apenas na Administração.',
    visibleMetric: 'news',
    hidden: { metric: 'drafts' },
    keywords: ['matéria', 'comentários'],
  },
  {
    key: 'links',
    label: 'Links úteis',
    group: 'Início e comunicação',
    publicHref: '/links-uteis',
    feedHref: '/admin/conteudo/links',
    feedLabel: 'Links úteis',
    mode: 'manual',
    how: 'Links cadastrados; sugestões dos Irmãos esperam decisão na mesma tela.',
    keywords: ['sites', 'sugestão'],
  },
  {
    key: 'irmaos',
    label: 'Diretório de Irmãos',
    group: 'Comunidade',
    publicHref: '/irmaos',
    feedHref: '/admin/pessoas/irmaos',
    feedLabel: 'Irmãos',
    mode: 'manual',
    how: 'Mostra Irmãos conforme a privacidade que cada um define; o cadastro mestre é o da Administração.',
    visibleMetric: 'active',
    keywords: ['diretório', 'cadastro', 'membros', 'perfil'],
  },
  {
    key: 'negocios',
    label: 'Negócios dos Irmãos',
    group: 'Comunidade',
    publicHref: '/irmaos/negocios',
    feedHref: '/admin/pessoas/negocios',
    feedLabel: 'Negócios',
    mode: 'manual',
    how: 'Negócios cadastrados pelos Irmãos; a Administração modera e corrige.',
    keywords: ['empresa', 'comércio'],
  },
  {
    key: 'honra',
    label: 'Galeria de Honra',
    group: 'Comunidade',
    publicHref: '/irmaos/galeria-de-honra',
    feedHref: '/admin/pessoas/irmaos',
    feedLabel: 'Irmãos (aba Honrarias da ficha)',
    mode: 'manual',
    how: 'Honrarias e condecorações são lançadas dentro da ficha de cada Irmão.',
    gap: 'Não há tela própria para conferir todas as honrarias de uma vez; hoje só se vê a vitrine no Portal.',
    keywords: ['honrarias', 'condecorações', 'títulos', 'homenageados'],
  },
  {
    key: 'paramaconicas',
    label: 'Comunidade Paramaçônica',
    group: 'Comunidade',
    publicHref: '/paramaconicas',
    feedHref: '/admin/pessoas/paramaconicas',
    feedLabel: 'Paramaçônicas',
    mode: 'manual',
    how: 'Entidades, cargos e integrantes cadastrados na Administração.',
    keywords: ['entidades', 'filhas', 'DeMolay', 'Arco-Íris'],
  },
  {
    key: 'meu-espaco',
    label: 'Perfil na Central VL6',
    group: 'Comunidade',
    publicHref: '/irmaos/meu-espaco',
    feedHref: '/admin/pessoas/central',
    feedLabel: 'Central VL6',
    mode: 'misto',
    how: 'O Irmão edita o próprio perfil; a Administração publica, suspende e acompanha.',
    keywords: ['perfil publicado', 'consentimento'],
  },
  {
    key: 'acervo',
    label: 'Acervo VL6',
    group: 'Acervo e memória',
    publicHref: '/acervo',
    feedHref: '/admin/acervo',
    feedLabel: 'Acervo',
    mode: 'misto',
    how: 'Só itens publicados aparecem; o que nasce de um acontecimento chega com data, local e gestão herdados.',
    visibleMetric: 'archivePublished',
    hidden: { total: 'archive', minus: 'archivePublished' },
    keywords: ['memória', 'catalogação', 'itens'],
  },
  {
    key: 'documentos',
    label: 'Documentos',
    group: 'Acervo e memória',
    publicHref: '/acervo/documentos',
    feedHref: '/admin/acervo/arquivos',
    feedLabel: 'Documentos',
    mode: 'manual',
    how: 'Documentos enviados com a visibilidade escolhida no envio.',
    visibleMetric: 'files',
    keywords: ['arquivos', 'PDF', 'atas'],
  },
  {
    key: 'fotos',
    label: 'Fotos e vídeos',
    group: 'Acervo e memória',
    publicHref: '/acervo/fotografias',
    feedHref: '/admin/acervo/galeria',
    feedLabel: 'Fotografias e vídeos',
    mode: 'manual',
    how: 'Álbuns e mídias enviados; o ideal é vincular ao acontecimento.',
    visibleMetric: 'albums',
    keywords: ['galeria', 'álbum', 'imagens'],
  },
  {
    key: 'biblioteca',
    label: 'Biblioteca',
    group: 'Acervo e memória',
    publicHref: '/acervo/biblioteca',
    feedHref: '/admin/acervo/biblioteca',
    feedLabel: 'Biblioteca',
    mode: 'manual',
    how: 'Obras e exemplares cadastrados; empréstimos seguem a fila da Biblioteca.',
    visibleMetric: 'library',
    keywords: ['livros', 'empréstimo', 'exemplares'],
  },
  {
    key: 'gestoes',
    label: 'Gestões',
    group: 'Acervo e memória',
    publicHref: '/acervo/gestoes',
    feedHref: '/admin/pessoas/gestoes',
    feedLabel: 'Gestões',
    mode: 'manual',
    how: 'Períodos, cargos e ocupantes; alimentam também o Início e os acontecimentos.',
    keywords: ['venerável', 'diretoria', 'cargos'],
  },
  {
    key: 'exposicoes',
    label: 'Exposições',
    group: 'Acervo e memória',
    publicHref: '/acervo/exposicoes',
    feedHref: '/admin/acervo/exposicoes',
    feedLabel: 'Exposições',
    mode: 'manual',
    how: 'Seleções de itens já existentes no Acervo, sem duplicar conteúdo.',
    keywords: ['curadoria'],
  },
  {
    key: 'colecoes',
    label: 'Coleções',
    group: 'Acervo e memória',
    publicHref: '/acervo/colecoes',
    feedHref: '/admin/acervo/colecoes',
    feedLabel: 'Coleções',
    mode: 'manual',
    how: 'Agrupamentos temáticos de itens do Acervo.',
  },
  {
    key: 'contribuir',
    label: 'Contribuições dos Irmãos',
    group: 'Acervo e memória',
    publicHref: '/acervo/contribuir',
    feedHref: '/admin/acervo/contribuicoes',
    feedLabel: 'Contribuições',
    mode: 'manual',
    how: 'Material enviado pelos Irmãos espera moderação antes de entrar no Acervo.',
    keywords: ['moderação', 'envios'],
  },
  {
    key: 'linha-do-tempo',
    label: 'Linha do tempo e Constelação',
    group: 'Acervo e memória',
    publicHref: '/acervo/linha-do-tempo',
    feedHref: '/admin/publicacoes',
    feedLabel: 'Acontecimentos',
    mode: 'automatico',
    how: 'Montadas sozinhas a partir dos acontecimentos e das mídias vinculadas; nada a digitar.',
    keywords: ['constelação', 'memória', 'cronologia'],
  },
  {
    key: 'conhecimento',
    label: 'Conhecimento VL6',
    group: 'Conhecimento e Cripta',
    publicHref: '/conhecimento',
    feedHref: '/admin/conhecimento',
    feedLabel: 'Conhecimento',
    mode: 'manual',
    how: 'Formações publicadas, atividades e certificados; revisões ficam na Administração.',
    visibleMetric: 'courses',
    keywords: ['formação', 'curso', 'certificado'],
  },
  {
    key: 'cripta',
    label: 'Cripta (cartas)',
    group: 'Conhecimento e Cripta',
    publicHref: '/cripta',
    feedHref: '/admin/cripta',
    feedLabel: 'Cripta',
    mode: 'misto',
    how: 'O Irmão escreve a própria carta; a Administração só conduz o ciclo e a cerimônia, sem ler conteúdo.',
    keywords: ['cápsula do tempo', 'cerimônia'],
  },
];

/**
 * Seções de `(member)` que não são alimentadas pela Administração, com o
 * motivo. Qualquer pasta de primeiro nível fora deste mapa e fora de
 * `PORTAL_SURFACES` reprova o teste de alinhamento.
 */
export const PORTAL_NOT_ADMIN_FED: Record<string, string> = {
  configuracoes: 'Preferências pessoais de cada Irmão.',
  downloads: 'Favoritos pessoais da Biblioteca.',
  eventos: 'Detalhe de um acontecimento; nasce da ficha em Acontecimentos.',
  arquivos: 'Endereço antigo; redireciona para Acervo > Documentos.',
  biblioteca: 'Endereço antigo; redireciona para Acervo > Biblioteca.',
  galeria: 'Endereço antigo; redireciona para Acervo > Fotos e vídeos.',
  'cripta-administracao': 'Operação da Cripta; já listada em Administração > Cripta.',
  'cripta-demonstracao': 'Ensaio da Cripta; listado em Administração avançada.',
  'cripta-laboratorio': 'Ensaio da Cripta; listado em Administração avançada.',
  'cripta-projetor': 'Projeção da cerimônia; listada em Administração > Cripta.',
};

export interface SurfaceCounts {
  visible: number | null;
  hidden: number | null;
}

export function resolveSurfaceCounts(
  surface: PortalSurface,
  metrics: ReadonlyMap<string, number | null>,
): SurfaceCounts {
  const visible = surface.visibleMetric ? (metrics.get(surface.visibleMetric) ?? null) : null;
  const rule = surface.hidden;
  if (!rule) return { visible, hidden: null };
  if ('metric' in rule) return { visible, hidden: metrics.get(rule.metric) ?? null };
  const total = metrics.get(rule.total);
  const shown = metrics.get(rule.minus);
  if (total == null || shown == null) return { visible, hidden: null };
  return { visible, hidden: Math.max(0, total - shown) };
}

/** Texto curto de estado, sempre por palavra e nunca só por cor. */
export function surfaceStatus(
  surface: PortalSurface,
  counts: SurfaceCounts,
  canFeed: boolean,
): { label: string; tone: 'ok' | 'atencao' | 'neutro' } {
  if (surface.gap) return { label: 'Lacuna conhecida', tone: 'atencao' };
  if (!canFeed) return { label: 'Sem acesso para alimentar', tone: 'neutro' };
  if (surface.mode === 'automatico') return { label: 'Automático', tone: 'ok' };
  if (counts.hidden && counts.hidden > 0)
    return { label: `${counts.hidden} aguardando publicação`, tone: 'atencao' };
  if (surface.visibleMetric && counts.visible === 0)
    return { label: 'Nada publicado ainda', tone: 'atencao' };
  return { label: 'Em dia', tone: 'ok' };
}
