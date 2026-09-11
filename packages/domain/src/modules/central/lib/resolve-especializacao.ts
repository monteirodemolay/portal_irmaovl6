import { ESPECIALIZACAO_BY_AREA, ESPECIALIZACAO_LABELS } from '@vl6/shared';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';

export interface ResolvedEspecializacao {
  key: string;
  label: string;
}

/**
 * Único ponto que lê `MemberCentralProfile.especializacao` — resolve pra um
 * rótulo de exibição, dependente da área de atuação atual. Nunca lança erro
 * — mesmo espírito de `resolveAreaAtuacao`: um valor que não pertence mais à
 * lista da área (área trocada depois, ou taxonomia reordenada) cai no rótulo
 * bruto guardado em vez de quebrar a tela. `null` cobre "não informado" e
 * "área não informada" (não dá pra validar especialização sem área).
 */
export function resolveEspecializacao(
  profile:
    | Pick<MemberCentralProfile, 'areaAtuacao' | 'especializacao' | 'especializacaoOutra'>
    | null
    | undefined,
): ResolvedEspecializacao | null {
  const key = profile?.especializacao;
  const area = profile?.areaAtuacao;
  if (!key || !area) return null;

  if (key === 'outra') {
    return {
      key,
      label: profile?.especializacaoOutra?.trim() || ESPECIALIZACAO_LABELS.outra || 'Outra',
    };
  }

  const validForArea = (ESPECIALIZACAO_BY_AREA[area] ?? []).includes(key);
  if (!validForArea) return { key: 'outra', label: key };

  return { key, label: ESPECIALIZACAO_LABELS[key] ?? key };
}
