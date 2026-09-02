import { describe, expect, it } from 'vitest';
import {
  deriveKinships,
  wouldCreateAncestryCycle,
  type FamilyRef,
  type RelationshipEdge,
} from './derive-kinships';

const member = (id: string): FamilyRef => ({ kind: 'member', id });
const familyPerson = (id: string): FamilyRef => ({ kind: 'familyPerson', id });

function parentEdge(
  id: string,
  parent: FamilyRef,
  child: FamilyRef,
  parentRole: 'pai' | 'mae' | 'responsavel' | null = null,
): RelationshipEdge {
  return { id, from: parent, to: child, relationKind: 'parent_of', parentRole, childRole: null };
}

function siblingEdge(id: string, a: FamilyRef, b: FamilyRef): RelationshipEdge {
  return { id, from: a, to: b, relationKind: 'sibling_of', parentRole: null, childRole: null };
}

function spouseEdge(id: string, a: FamilyRef, b: FamilyRef): RelationshipEdge {
  return { id, from: a, to: b, relationKind: 'spouse_of', parentRole: null, childRole: null };
}

describe('deriveKinships', () => {
  it('gera leitura inversa pai e filho a partir de uma única aresta', () => {
    const luis = member('luis');
    const mae = familyPerson('mae');
    const edges = [parentEdge('r1', mae, luis, 'mae')];

    const fromLuis = deriveKinships(luis, edges);
    expect(fromLuis).toContainEqual(
      expect.objectContaining({ person: mae, label: 'Pai ou mãe', direct: true }),
    );

    const fromMae = deriveKinships(mae, edges);
    expect(fromMae).toContainEqual(
      expect.objectContaining({ person: luis, label: 'Filho ou filha', direct: true }),
    );
  });

  it('calcula avô materno e bisavô materno pela cadeia mãe -> avô -> bisavô', () => {
    const luis = member('luis');
    const maeVL6 = familyPerson('mae');
    const avo = familyPerson('avo');
    const bisavo = familyPerson('bisavo');
    const edges = [
      parentEdge('r-mae', maeVL6, luis, 'mae'),
      parentEdge('r-avo', avo, maeVL6, 'mae'),
      parentEdge('r-bisavo', bisavo, avo, 'mae'),
    ];

    const result = deriveKinships(luis, edges);

    const avoKinship = result.find((k) => k.person.id === 'avo');
    expect(avoKinship?.label).toBe('Avô ou avó materno(a)');
    expect(avoKinship?.lineageSide).toBe('maternal');
    expect(avoKinship?.pathRelationshipIds).toEqual(['r-mae', 'r-avo']);

    const bisavoKinship = result.find((k) => k.person.id === 'bisavo');
    expect(bisavoKinship?.label).toBe('Bisavô ou bisavó materno(a)');
    expect(bisavoKinship?.lineageSide).toBe('maternal');
    expect(bisavoKinship?.pathRelationshipIds).toEqual(['r-mae', 'r-avo', 'r-bisavo']);
  });

  it('calcula neto, tio, sobrinho e primo', () => {
    const luis = member('luis');
    const pai = familyPerson('pai');
    const tio = familyPerson('tio');
    const primo = familyPerson('primo');
    const filho = familyPerson('filho');
    const neto = familyPerson('neto');

    const edges = [
      parentEdge('r-pai', pai, luis, 'pai'),
      siblingEdge('r-sib', pai, tio),
      parentEdge('r-primo', tio, primo),
      parentEdge('r-filho', luis, filho),
      parentEdge('r-neto', filho, neto),
    ];

    const result = deriveKinships(luis, edges);

    expect(result.find((k) => k.person.id === 'tio')?.label).toBe('Tio ou tia');
    expect(result.find((k) => k.person.id === 'primo')?.label).toBe('Primo ou prima');
    expect(result.find((k) => k.person.id === 'filho')?.label).toBe('Filho ou filha');
    expect(result.find((k) => k.person.id === 'neto')?.label).toBe('Neto ou neta');
  });

  it('calcula sogro, genro, nora e cunhado', () => {
    const luis = member('luis');
    const conjuge = familyPerson('conjuge');
    const sogro = familyPerson('sogro');
    const irmaoConjuge = familyPerson('irmao-conjuge');
    const filho = familyPerson('filho');
    const genro = familyPerson('genro');

    const edges = [
      spouseEdge('r-spouse', luis, conjuge),
      parentEdge('r-sogro', sogro, conjuge),
      siblingEdge('r-cunhado', conjuge, irmaoConjuge),
      parentEdge('r-filho', luis, filho),
      spouseEdge('r-genro', filho, genro),
    ];

    const result = deriveKinships(luis, edges);

    expect(result.find((k) => k.person.id === 'sogro')?.label).toBe('Sogro ou sogra');
    expect(result.find((k) => k.person.id === 'irmao-conjuge')?.label).toBe('Cunhado ou cunhada');
    expect(result.find((k) => k.person.id === 'genro')?.label).toBe('Genro ou nora');
  });

  it('limita a profundidade padrão a quatro gerações', () => {
    const p0 = member('p0');
    const p1 = familyPerson('p1');
    const p2 = familyPerson('p2');
    const p3 = familyPerson('p3');
    const p4 = familyPerson('p4');
    const p5 = familyPerson('p5');

    const edges = [
      parentEdge('r1', p1, p0),
      parentEdge('r2', p2, p1),
      parentEdge('r3', p3, p2),
      parentEdge('r4', p4, p3),
      parentEdge('r5', p5, p4),
    ];

    const result = deriveKinships(p0, edges);
    expect(result.some((k) => k.person.id === 'p4')).toBe(true);
    expect(result.some((k) => k.person.id === 'p5')).toBe(false);
  });

  it('preserva o caminho explicável (pathRelationshipIds) usado no cálculo', () => {
    const luis = member('luis');
    const mae = familyPerson('mae');
    const avo = familyPerson('avo');
    const edges = [parentEdge('r-mae', mae, luis, 'mae'), parentEdge('r-avo', avo, mae, 'mae')];

    const result = deriveKinships(luis, edges);
    const avoKinship = result.find((k) => k.person.id === 'avo');
    expect(avoKinship?.pathRelationshipIds).toEqual(['r-mae', 'r-avo']);
  });
});

describe('wouldCreateAncestryCycle', () => {
  it('impede ciclo de ascendência (neto declarado como ancestral do próprio avô)', () => {
    const avo = familyPerson('avo');
    const pai = familyPerson('pai');
    const neto = member('neto');
    const edges = [parentEdge('r1', avo, pai), parentEdge('r2', pai, neto)];

    // Tentando declarar o neto como pai do avô fecharia o ciclo.
    expect(wouldCreateAncestryCycle(neto, avo, edges)).toBe(true);
  });

  it('permite uma nova ascendência que não fecha ciclo', () => {
    const avo = familyPerson('avo');
    const pai = familyPerson('pai');
    const edges = [parentEdge('r1', avo, pai)];
    const novoBisavo = familyPerson('bisavo');

    expect(wouldCreateAncestryCycle(novoBisavo, avo, edges)).toBe(false);
  });

  it('impede autorrelação de ascendência', () => {
    const pessoa = member('p1');
    expect(wouldCreateAncestryCycle(pessoa, pessoa, [])).toBe(true);
  });
});
