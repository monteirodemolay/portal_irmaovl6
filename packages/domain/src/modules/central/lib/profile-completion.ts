import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';

interface CompletionCategory {
  weight: number;
  filled: (member: Member, profile: MemberCentralProfile | null) => boolean;
}

/**
 * Categorias do anel de completude do "Meu Espaço" — pesos somando 100.
 * Cobre `Member` (dados de uso interno que também contam pro "espaço
 * preenchido") e `MemberCentralProfile` (conteúdo voluntário da Central)
 * juntos, já que o anel representa o espaço inteiro do Irmão, não só o que
 * está publicado. Determinístico, sem I/O — cada categoria conta como
 * preenchida se ao menos um dos seus campos tem valor.
 */
const COMPLETION_CATEGORIES: CompletionCategory[] = [
  { weight: 10, filled: (member) => Boolean(member.fotoUrl) },
  {
    weight: 15,
    filled: (_member, profile) =>
      Boolean(profile?.apresentacao || profile?.interesses || profile?.cidadeExibicao),
  },
  {
    weight: 20,
    filled: (member, profile) =>
      Boolean(
        member.profissao || profile?.areaAtuacao || profile?.formacao || profile?.resumoProfissional,
      ),
  },
  {
    weight: 15,
    filled: (_member, profile) =>
      Boolean((profile?.competencias.length ?? 0) > 0 || (profile?.servicos.length ?? 0) > 0),
  },
  {
    weight: 10,
    filled: (member, profile) => Boolean((profile?.negocios.length ?? 0) > 0 || member.empresa),
  },
  { weight: 15, filled: (member) => Boolean(member.telefone || member.whatsapp) },
  {
    weight: 15,
    filled: (_member, profile) =>
      Boolean(profile?.externalLinks && Object.values(profile.externalLinks).some(Boolean)),
  },
];

export function calculateProfileCompletion(
  member: Member,
  profile: MemberCentralProfile | null,
): number {
  return COMPLETION_CATEGORIES.reduce(
    (total, category) => total + (category.filled(member, profile) ? category.weight : 0),
    0,
  );
}
