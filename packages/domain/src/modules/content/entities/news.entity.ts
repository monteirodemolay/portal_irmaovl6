import type { BaseEntity } from '../../../shared/base-entity';

export interface News extends BaseEntity {
  titulo: string;
  subtitulo: string | null;
  slug: string;
  imagemCapaUrl: string | null;
  conteudoHtml: string;
  autorId: string;
  categoria: string;
  publicado: boolean;
  dataPublicacao: Date | null;
  contagemVisualizacoes: number;
}
