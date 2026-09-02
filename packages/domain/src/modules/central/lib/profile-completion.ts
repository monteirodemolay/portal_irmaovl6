import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';

interface CompletionCategory {
  weight: number;
  filled: (member: Member, profile: MemberCentralProfile | null) => boolean;
}

/**
 * Categorias do anel de completude do "Meu Espaço" — pesos somando 100.
 *
 * Decisão (revisão pedida pelo Administrador da Loja, 2026-09):
 * a fórmula original misturava dados de PERFIL PESSOAL com dados de
 * TRABALHO/profissão ("atuação profissional", peso 20, e "negócio ou
 * empresa vinculada", peso 10) dentro do mesmo cálculo "essencial". Isso
 * penalizava estruturalmente Irmãos aposentados ou sem negócio próprio:
 * eles nunca chegavam perto de 100%, não por deixarem de preencher algo,
 * mas porque esses campos genuinamente não se aplicam a eles.
 *
 * `profissao`/`areaAtuacao`/`formacao`/`resumoProfissional`/`negocios`/
 * `member.empresa` são voluntários por natureza (nem todo Irmão trabalha
 * ou tem negócio vinculado à Loja) e por isso SAÍRAM do cálculo
 * "fundamental" de completude — continuam existindo no cadastro e no
 * Diretório normalmente, só não contam pra esse indicador. O que sobra e
 * compõe os 100 pontos é o que é razoável esperar de qualquer perfil
 * pessoal, aposentado ou não: foto, uma apresentação de si (texto,
 * interesses ou cidade), um contato, e presença em pelo menos uma rede
 * social/link externo. `competencias`/`servicos` continuam contando, mas
 * como complemento opcional de peso baixo — não fazem falta pra um Irmão
 * aposentado chegar perto de 100%.
 */
const COMPLETION_CATEGORIES: CompletionCategory[] = [
  { weight: 20, filled: (member) => Boolean(member.fotoUrl) },
  {
    weight: 30,
    filled: (_member, profile) =>
      Boolean(profile?.apresentacao || profile?.interesses || profile?.cidadeExibicao),
  },
  { weight: 25, filled: (member) => Boolean(member.telefone || member.whatsapp) },
  {
    weight: 20,
    filled: (_member, profile) =>
      Boolean(profile?.externalLinks && Object.values(profile.externalLinks).some(Boolean)),
  },
  {
    weight: 5,
    // `competencias`/`servicos` são campos novos — documentos gravados antes
    // dessa mudança de schema não têm essas chaves no Firestore (schemaless:
    // `undefined`, não `[]`), por isso o encadeamento precisa de `?.` também
    // depois de `profile?.`, não só nele.
    filled: (_member, profile) =>
      Boolean((profile?.competencias?.length ?? 0) > 0 || (profile?.servicos?.length ?? 0) > 0),
  },
];

/**
 * Estimativa informativa de preenchimento do perfil pessoal — nunca uma
 * meta obrigatória (ver texto auxiliar no `SpaceHeader`). Dados de
 * trabalho/profissão/negócio ficam deliberadamente de fora — ver
 * comentário acima de `COMPLETION_CATEGORIES`.
 */
export function calculateProfileCompletion(
  member: Member,
  profile: MemberCentralProfile | null,
): number {
  return COMPLETION_CATEGORIES.reduce(
    (total, category) => total + (category.filled(member, profile) ? category.weight : 0),
    0,
  );
}
