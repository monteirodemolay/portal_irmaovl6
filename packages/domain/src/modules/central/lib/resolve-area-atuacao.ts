import { AREA_ATUACAO_KEYS, AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';

export interface ResolvedAreaAtuacao {
  key: AreaAtuacaoKey;
  label: string;
}

/**
 * Único ponto que lê `MemberCentralProfile.areaAtuacao` — resolve pra uma
 * chave válida da taxonomia + rótulo de exibição. Nunca lança erro: um
 * documento gravado antes da taxonomia fechada (quando o campo era texto
 * livre) tem um valor que não bate com nenhuma chave — em vez de quebrar,
 * cai no balde "Outra" preservando o texto original como rótulo. O
 * documento se autocorrige sozinho na próxima vez que o Irmão salvar a aba
 * Profissional (o formulário sempre grava uma chave válida + `outra`).
 */
export function resolveAreaAtuacao(
  profile: Pick<MemberCentralProfile, 'areaAtuacao' | 'areaAtuacaoOutra'> | null | undefined,
): ResolvedAreaAtuacao | null {
  const raw = profile?.areaAtuacao;
  if (!raw) return null;

  if ((AREA_ATUACAO_KEYS as readonly string[]).includes(raw)) {
    const key = raw as AreaAtuacaoKey;
    if (key === 'outra') {
      return { key, label: profile?.areaAtuacaoOutra?.trim() || AREA_ATUACAO_LABELS.outra };
    }
    return { key, label: AREA_ATUACAO_LABELS[key] };
  }

  // Valor legado (texto livre, pré-taxonomia) ou qualquer string desconhecida.
  return { key: 'outra', label: raw };
}
