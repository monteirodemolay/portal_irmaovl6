import type { FamilyDisplayGroup } from '@vl6/shared';

/**
 * Classifica um rótulo de parentesco já calculado (`DerivedKinship.label`,
 * `deriveKinships` no domínio) num dos 5 grupos de exibição do "Meu Espaço"
 * (04_TELAS_E_FLUXOS.md §1). Comparação por prefixo porque o domínio
 * acrescenta o sufixo "materno(a)"/"paterno(a)" em avô/bisavô.
 */
export function classifyFamilyDisplayGroup(label: string): FamilyDisplayGroup {
  if (/^(Pai ou mãe|Avô ou avó|Bisavô ou bisavó|Trisavô ou trisavó)/.test(label)) return 'ascendentes';
  if (/^(Filho ou filha|Neto ou neta|Bisneto ou bisneta)/.test(label)) return 'descendentes';
  if (/^(Irmão ou irmã|Cônjuge)/.test(label)) return 'familia_proxima';
  if (/^(Sogro ou sogra|Genro ou nora|Cunhado ou cunhada)/.test(label)) return 'familia_por_afinidade';
  return 'outros_vinculos'; // Tio/tia, sobrinho/sobrinha, primo/prima, parentesco declarado
}

/**
 * Vínculo direto oferecido no painel "Adicionar familiar"
 * (04_TELAS_E_FLUXOS.md §3) — sempre relativo à pessoa-âncora escolhida no
 * formulário (o próprio Irmão por padrão, ou um familiar que ele já
 * gerencia, permitindo montar a cadeia bisavô -> avô -> mãe -> Irmão aos
 * poucos). Cobre o vocabulário fechado de `FAMILY_RELATION_KINDS`.
 */
export const DIRECT_LINK_KINDS = [
  'mae',
  'pai',
  'filho_filha',
  'conjuge',
  'companheiro',
  'irmao_irma',
  'responsavel',
  'padrasto_madrasta',
  'outro',
] as const;
export type DirectLinkKind = (typeof DIRECT_LINK_KINDS)[number];

/**
 * Sempre fraseado "Ele(a) é meu/minha ___" — a pessoa que você vai buscar/
 * cadastrar abaixo é o sujeito, você (ou o familiar-âncora escolhido) é
 * quem recebe o vínculo. Antes usava "É mãe de"/"É filho(a) de" sem deixar
 * claro de quem era o "de" — Administrador confirmou o erro real: marcou
 * "É filho(a) de" pra cadastrar o próprio pai, esperando que significasse
 * "eu sou filho de", quando o sistema (corretamente, mas ambiguamente)
 * tratava como "essa pessoa é filha minha". O vínculo salvo (`parent_of`
 * etc., ver `resolveRelationEndpoints`) não muda — só o texto, agora
 * impossível de ler ao contrário.
 */
export const DIRECT_LINK_LABELS: Record<DirectLinkKind, string> = {
  mae: 'Ele(a) é minha mãe',
  pai: 'Ele(a) é meu pai',
  filho_filha: 'Ele(a) é meu(minha) filho(a)',
  conjuge: 'Ele(a) é meu(minha) cônjuge',
  companheiro: 'Ele(a) é meu(minha) companheiro(a)',
  irmao_irma: 'Ele(a) é meu(minha) irmão(ã)',
  responsavel: 'Ele(a) é meu(minha) responsável (tutor/guardião)',
  padrasto_madrasta: 'Ele(a) é meu padrasto ou minha madrasta',
  outro: 'Outro vínculo (declarar)',
};

export interface RelationEndpoints {
  fromKind: 'member' | 'familyPerson';
  fromId: string;
  toKind: 'member' | 'familyPerson';
  toId: string;
  relationKind:
    | 'parent_of'
    | 'spouse_of'
    | 'partner_of'
    | 'sibling_of'
    | 'guardian_of'
    | 'step_parent_of'
    | 'declared_kinship';
  parentRole: 'pai' | 'mae' | 'responsavel' | null;
  childRole: 'filho' | 'filha' | 'descendente' | null;
}

/**
 * Resolve as duas pontas e o tipo de relação a partir do vínculo direto
 * escolhido no formulário — `anchor` é a pessoa já existente na rede (o
 * próprio Irmão ou um familiar que ele gerencia), `person` é a pessoa
 * nova/encontrada sendo ligada a ela.
 */
export function resolveRelationEndpoints(
  linkKind: DirectLinkKind,
  anchor: { kind: 'member' | 'familyPerson'; id: string },
  person: { kind: 'member' | 'familyPerson'; id: string },
): Omit<RelationEndpoints, 'relationKind'> & { relationKind: RelationEndpoints['relationKind'] } {
  switch (linkKind) {
    case 'mae':
      return {
        fromKind: person.kind,
        fromId: person.id,
        toKind: anchor.kind,
        toId: anchor.id,
        relationKind: 'parent_of',
        parentRole: 'mae',
        childRole: null,
      };
    case 'pai':
      return {
        fromKind: person.kind,
        fromId: person.id,
        toKind: anchor.kind,
        toId: anchor.id,
        relationKind: 'parent_of',
        parentRole: 'pai',
        childRole: null,
      };
    case 'filho_filha':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'parent_of',
        parentRole: null,
        // Rótulo exibido é sempre "Filho ou filha" (deriveKinships,
        // classifyFamilyDisplayGroup) independente do gênero — não há
        // opção separada "filho"/"filha" no formulário, então
        // `descendente` cobre ambos sem forçar essa distinção.
        childRole: 'descendente',
      };
    case 'conjuge':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'spouse_of',
        parentRole: null,
        childRole: null,
      };
    case 'companheiro':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'partner_of',
        parentRole: null,
        childRole: null,
      };
    case 'irmao_irma':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'sibling_of',
        parentRole: null,
        childRole: null,
      };
    case 'responsavel':
      return {
        fromKind: person.kind,
        fromId: person.id,
        toKind: anchor.kind,
        toId: anchor.id,
        relationKind: 'guardian_of',
        parentRole: 'responsavel',
        childRole: null,
      };
    case 'padrasto_madrasta':
      return {
        fromKind: person.kind,
        fromId: person.id,
        toKind: anchor.kind,
        toId: anchor.id,
        relationKind: 'step_parent_of',
        parentRole: null,
        childRole: null,
      };
    case 'outro':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'declared_kinship',
        parentRole: null,
        childRole: null,
      };
  }
}
