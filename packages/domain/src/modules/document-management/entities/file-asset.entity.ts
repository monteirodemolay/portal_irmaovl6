import type { FileKind } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

export interface FileAsset extends BaseEntity {
  titulo: string;
  descricao: string | null;
  categoriaId: string;
  acervo: string | null;
  autor: string | null;
  tipo: FileKind;
  urlArquivo: string;
  urlMiniatura: string | null;
  versao: number;
  publicado: boolean;
  permitirDownload: boolean;
  contagemDownloads: number;
  contagemVisualizacoes: number;
  dataPublicacao: Date | null;
  ordem: number;
  tamanhoBytes: number;
}
