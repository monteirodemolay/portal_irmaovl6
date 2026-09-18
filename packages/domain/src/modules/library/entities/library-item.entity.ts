import type { BaseEntity } from '../../../shared/base-entity';

/** Camada de curadoria/categorização sobre um `FileAsset` — não duplica o binário. */
export interface LibraryItem extends BaseEntity {
  fileId: string | null;
  categoriaId: string;
  subcategoriaId: string | null;
  permiteLeituraOnline: boolean;
  contagemDownloads: number;
  contagemVisualizacoes: number;
  titulo?: string;
  autor?: string | null;
  tipoMaterial?: 'livro' | 'artigo' | 'periodico' | 'publicacao' | 'outro';
  formato?: 'digital' | 'fisico' | 'fisico_digital';
  anoPublicacao?: number | null;
  editora?: string | null;
  isbn?: string | null;
  codigoBarras?: string | null;
  codigoClassificacao?: string | null;
  palavrasChave?: string[];
  sinopse?: string | null;
  parecerBibliotecario?: string | null;
  capaUrl?: string | null;
  prazoEmprestimoDias?: number;
  contagemEmprestimos?: number;
  somaAvaliacoes?: number;
  quantidadeAvaliacoes?: number;
}
