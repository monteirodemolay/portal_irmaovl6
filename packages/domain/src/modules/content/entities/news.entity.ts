import type { BaseEntity } from '../../../shared/base-entity';

export interface News extends BaseEntity {
  titulo: string;
  subtitulo: string | null;
  slug: string;
  imagemCapaUrl: string | null;
  conteudoHtml: string;
  autorId: string;
  categoria: string;
  destaque?: boolean;
  destaquePrincipal?: boolean;
  /**
   * Evento/Sessão que originou historicamente a matéria. A data editorial
   * permanece em dataPublicacao; a data histórica vem de Event.dataInicio.
   * Opcional para compatibilidade com notícias legadas.
   */
  eventId?: string | null;
  publicado: boolean;
  dataPublicacao: Date | null;
  contagemVisualizacoes: number;
}
