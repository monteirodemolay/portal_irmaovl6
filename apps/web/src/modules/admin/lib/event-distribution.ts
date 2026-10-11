import type { Announcement, ArchiveItem, ArchiveMedia, Event, News } from '@vl6/domain';
import { isConstellationVisualMedia } from '@/modules/archive/lib/constellation-media-eligibility';

export interface DistributionDestination {
  name: string;
  state: string;
  rule: string;
  href: string;
}

export function isEventConstellationEligible(
  event: Event,
  archive: ArchiveItem[],
  media: ArchiveMedia[],
): boolean {
  const publishedItems = archive.filter(
    (item) =>
      !item.deletedAt &&
      item.publicacaoStatus === 'publicado' &&
      item.nivelAcesso !== 'administracao',
  );
  return (
    !event.deletedAt &&
    event.nivelAcesso !== 'administracao' &&
    media.some(
      (item) =>
        isConstellationVisualMedia(item) &&
        item.accessLevel !== 'administracao' &&
        publishedItems.some((parent) => parent.id === item.archiveItemId),
    )
  );
}

/** Estados derivados das fontes canônicas; nunca persiste uma segunda publicação. */
export function resolveEventDistribution({
  event,
  news,
  announcements,
  archive,
  media,
  now,
  unavailable = [],
  homePlacement,
}: {
  event: Event;
  news: News[];
  announcements: Announcement[];
  archive: ArchiveItem[];
  media: ArchiveMedia[];
  now: Date;
  unavailable?: string[];
  homePlacement?: { event: boolean; news: number; announcements: number };
}): DistributionDestination[] {
  const publishedNews = news.filter((n) => n.publicado && !n.deletedAt);
  const activeAnnouncements = announcements.filter(
    (a) => a.publicado && !a.deletedAt && (!a.dataExpiracao || a.dataExpiracao >= now),
  );
  const publishedItems = archive.filter((a) => a.publicacaoStatus === 'publicado' && !a.deletedAt);
  const visual = isEventConstellationEligible(event, archive, media);
  const future = !event.deletedAt && event.dataInicio >= now;
  const home = event.exibirNaTelaInicial !== false;
  const unknown = (sources: string[]) => sources.some((s) => unavailable.includes(s));
  return [
    {
      name: 'Tela Inicial',
      state: unknown(['Agenda do Início', 'Notícias do Início', 'Avisos do Início'])
        ? 'Não foi possível verificar'
        : homePlacement
          ? homePlacement.event || homePlacement.news || homePlacement.announcements
            ? `Em exibição: ${homePlacement.event ? 'acontecimento; ' : ''}${homePlacement.news} notícia(s); ${homePlacement.announcements} aviso(s)`
            : 'Sem conteúdo selecionado no Início'
          : future && home
            ? 'Elegível na agenda do Início'
            : future
              ? 'Acontecimento oculto no Início'
              : 'Agenda do Início encerrada',
      rule: 'Seleção atual: até três próximos por tipo, três notícias recentes e dois avisos por destaque/prioridade. O controle abaixo afeta a vitrine do acontecimento; notícias e avisos seguem suas publicações.',
      href: '#distribuicao-controles',
    },
    {
      name: 'Próximas Sessões',
      state:
        event.tipo !== 'sessao'
          ? 'Não se aplica a este tipo'
          : !future
            ? 'Sessão já iniciada'
            : !home
              ? 'Oculta no Início'
              : homePlacement
                ? homePlacement.event
                  ? 'Em exibição no Início'
                  : 'Aguardando posição na vitrine'
                : 'Elegível no Início',
      rule: 'Automático para sessões futuras habilitadas na Tela Inicial. A Agenda continua preservada.',
      href: '#distribuicao-controles',
    },
    {
      name: 'Agenda',
      state: event.deletedAt ? 'Arquivado' : 'Disponível na Agenda',
      rule: 'Automático a partir da data e dos dados do Acontecimento. Arquivar retira o registro da operação.',
      href: '#dados',
    },
    {
      name: 'Notícias',
      state: unknown(['Notícias'])
        ? 'Não foi possível verificar'
        : publishedNews.length
          ? `${publishedNews.length} publicada(s)`
          : news.length
            ? 'Aguardando publicação'
            : 'Sem notícia vinculada',
      rule: 'Publicação manual da notícia na ficha. Destaque e capa são editados na notícia; não há outro cadastro.',
      href: '#noticia',
    },
    {
      name: 'Acervo VL6',
      state: unknown(['Acervo', 'Mídias do Acervo'])
        ? 'Não foi possível verificar'
        : publishedItems.length
          ? `${publishedItems.length} item(ns) publicado(s)`
          : media.length
            ? 'Aguardando revisão e publicação'
            : 'Aguardando conteúdo',
      rule: 'Envio e publicação manual no bloco Memória. Sem mídia, não criar álbum vazio. Acesso definido no item e na mídia.',
      href: '#memoria',
    },
    {
      name: 'Linha do Tempo',
      state: event.exibirNaLinhaDoTempo !== false ? 'Habilitada automaticamente' : 'Oculta',
      rule: 'Usa a data do Acontecimento e respeita o nível de acesso. Notícias vinculadas são derivados do mesmo fato.',
      href: '#distribuicao-controles',
    },
    {
      name: 'Constelação VL6',
      state: unknown(['Acervo', 'Mídias do Acervo'])
        ? 'Não foi possível verificar'
        : event.nivelAcesso === 'administracao'
          ? 'Restrita à Administração'
          : visual
            ? 'Elegível para seleção automática'
            : 'Aguardando foto ou vídeo publicado',
      rule: 'Automático: item publicado com foto/vídeo publicado e arquivo válido. Respeita acesso, filtros e limite de seleção; elegível não garante exibição imediata.',
      href: '#memoria',
    },
    {
      name: 'Instagram',
      state: unknown(['Notícias'])
        ? 'Não foi possível verificar'
        : news.some((n) => n.instagramUrls?.length)
          ? 'Link externo registrado'
          : 'Sem link de publicação registrado',
      rule: 'Envio manual fora do Portal. Prepare a arte e registre o link na ficha. O link não comprova disponibilidade atual no Instagram.',
      href: '#comunicacao',
    },
    {
      name: 'Comunicação interna',
      state: unknown(['Avisos'])
        ? 'Não foi possível verificar'
        : activeAnnouncements.length
          ? `${activeAnnouncements.length} aviso(s) ativo(s)`
          : announcements.length
            ? 'Avisos em rascunho ou expirados'
            : 'Sem aviso vinculado',
      rule: 'Publicação manual do aviso; validade, destaque e notificações seguem as regras existentes. Notícia publicada tem finalidade pública: use aviso para comunicação interna.',
      href: '#aviso',
    },
  ];
}
