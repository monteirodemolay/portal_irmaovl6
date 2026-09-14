import type { HonorTypeKey } from '@vl6/shared';
import type { BaseEntity } from '../../../shared/base-entity';

/**
 * Honraria ou Condecoração recebida (levantamento institucional do
 * Administrador §3, "Honrarias e Condecorações") — medalha, comenda,
 * diploma, certificado ou homenagem. Cobre também §5 ("Membros Honorários
 * da VL6") e §6 ("Distinções que a própria VL6 concede"), que têm os
 * mesmos campos (instituição concedente, data, ato/decreto, motivo,
 * documento comprobatório).
 *
 * `memberId` é `null` quando o homenageado NÃO é um Irmão cadastrado na
 * VL6 — caso central do levantamento §5 (Membro Honorário de outra Loja,
 * nunca filiado aqui). Nesse caso, `homenageadoNome`/`homenageadoLojaOrigem`/
 * `homenageadoOriente` guardam a identificação de quem recebeu a honraria.
 * Uma Honraria com `memberId` preenchido nunca preenche os três campos de
 * homenageado externo (e vice-versa) — o Use Case garante essa exclusão
 * mútua, a entidade só documenta a regra.
 */
export interface Honor extends BaseEntity {
  memberId: string | null;
  homenageadoNome: string | null;
  homenageadoLojaOrigem: string | null;
  homenageadoOriente: string | null;
  nomeOficial: string;
  tipo: HonorTypeKey;
  instituicaoConcedente: string;
  data: Date | null;
  /** Número do ato, decreto, resolução ou registro em ata que fundamenta a concessão. */
  numeroAto: string | null;
  motivo: string | null;
  descricaoHistorica: string | null;
  /** `FileAsset.id` do diploma/certificado digitalizado, quando anexado. */
  diplomaFileId: string | null;
  /** `FileAsset.id` da fotografia da entrega, quando anexada. */
  fotoEntregaFileId: string | null;
}
