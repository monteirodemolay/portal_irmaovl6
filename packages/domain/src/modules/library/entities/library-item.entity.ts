import type { BaseEntity } from '../../../shared/base-entity';

/** Camada de curadoria/categorização sobre um `FileAsset` — não duplica o binário. */
export interface LibraryItem extends BaseEntity {
  fileId: string;
  categoriaId: string;
  subcategoriaId: string | null;
  permiteLeituraOnline: boolean;
  contagemDownloads: number;
  contagemVisualizacoes: number;
}
