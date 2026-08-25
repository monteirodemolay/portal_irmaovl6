import type {
  ArtTemplateType,
  PublicationOutputFormat,
  TemplateFieldAlignment,
  TemplateFieldType,
} from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Um campo de texto posicionado sobre o modelo — posição em PORCENTAGEM da
 * arte (`xPercent`/`yPercent`, 0–100), nunca pixel fixo, pra funcionar em
 * qualquer resolução de tela do editor visual e em qualquer formato de
 * saída derivado do mesmo modelo. `align` decide a partir de qual ponto o
 * texto cresce (`center` = cresce dos dois lados de `xPercent`).
 */
export interface TemplateField {
  key: string;
  label: string;
  type: TemplateFieldType;
  required: boolean;
  maxLength: number | null;
  xPercent: number;
  yPercent: number;
  fontSizePx: number;
  color: string;
  align: TemplateFieldAlignment;
  /** Só usado quando `type === 'select'`. */
  options: string[] | null;
}

/**
 * Modelo institucional de arte (Central de Comunicação, docs/architecture)
 * — a imagem de fundo é fixa (brasões, moldura, identidade visual
 * protegida); só os `fields` são editáveis, cada um numa posição definida
 * visualmente pelo Administrador no editor de arrastar, nunca por
 * coordenada digitada.
 */
export interface ArtTemplate extends BaseEntity {
  name: string;
  type: ArtTemplateType;
  version: number;
  backgroundUrl: string;
  backgroundWidth: number;
  backgroundHeight: number;
  outputFormats: PublicationOutputFormat[];
  fields: TemplateField[];
  active: boolean;
}
