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
  /**
   * Links de publicações externas no Instagram relacionadas a esta matéria.
   * O vínculo é editorial: quando a notícia está ligada a um Evento, esses
   * links também aparecem automaticamente na memória daquele acontecimento.
   * Campo aditivo/opcional para compatibilidade com notícias legadas.
   */
  instagramUrls?: string[];
  /**
   * Versão da reconciliação automática Notícias → Evento → Acervo. Ausente/0
   * indica registro legado ainda não conferido pelo reconciliador. O número
   * permite evoluir a rotina no futuro e refazer o backfill sem criar outro
   * campo ou perder idempotência.
   */
  archiveSyncVersion?: number;
  publicado: boolean;
  dataPublicacao: Date | null;
  contagemVisualizacoes: number;
}
