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
  'filho',
  'filha',
  'conjuge',
  'companheiro',
  'irmao_irma',
  'responsavel',
  'padrasto_madrasta',
  'outro',
] as const;
export type DirectLinkKind = (typeof DIRECT_LINK_KINDS)[number];

export const DIRECT_LINK_LABELS: Record<DirectLinkKind, string> = {
  mae: 'É mãe de',
  pai: 'É pai de',
  filho: 'É filho de',
  filha: 'É filha de',
  conjuge: 'É cônjuge de',
  companheiro: 'É companheiro(a) de',
  irmao_irma: 'É irmão ou irmã de',
  responsavel: 'É responsável (guardião) de',
  padrasto_madrasta: 'É padrasto ou madrasta de',
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
    case 'filho':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'parent_of',
        parentRole: null,
        childRole: 'filho',
      };
    case 'filha':
      return {
        fromKind: anchor.kind,
        fromId: anchor.id,
        toKind: person.kind,
        toId: person.id,
        relationKind: 'parent_of',
        parentRole: null,
        childRole: 'filha',
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
