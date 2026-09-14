import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Grau Filosófico ou vínculo com Corpo Maçônico (levantamento institucional
 * do Administrador §4, "Graus Filosóficos e Corpos Maçônicos") — rito,
 * corpo, grau alcançado e funções exercidas. Sempre de um Irmão cadastrado
 * (diferente de `Honor`, que admite homenageado externo).
 *
 * `visivel` é opt-in, default `false` — o próprio levantamento pede
 * "observadas as normas quanto à divulgação": diferente de Títulos/
 * Honrarias (sempre institucionais, sempre exibidos), Grau Filosófico é
 * informação sensível por natureza (ligada a corpos com regras de sigilo
 * próprias) e só aparece no Perfil quando o Irmão (ou a Administração, em
 * seu nome) autoriza explicitamente.
 */
export interface PhilosophicalJourney extends BaseEntity {
  memberId: string;
  rito: string;
  corpoMaconico: string | null;
  grau: string | null;
  instituicao: string | null;
  data: Date | null;
  funcoesExercidas: string | null;
  visivel: boolean;
}
