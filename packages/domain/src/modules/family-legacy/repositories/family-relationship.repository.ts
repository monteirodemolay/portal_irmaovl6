import type { FamilyPersonRefKind } from '@vl6/shared';
import type { FamilyRelationship } from '../entities/family-relationship.entity';

export interface IFamilyRelationshipRepository {
  findById(id: string): Promise<FamilyRelationship | null>;
  /** Relações em que a pessoa aparece como origem OU destino, mescladas e sem duplicatas. */
  listByEndpoint(
    tenantId: string,
    kind: FamilyPersonRefKind,
    id: string,
  ): Promise<FamilyRelationship[]>;
  /** Sub-rede completa (todas as relações do tenant) — usada pela derivação de parentesco, que precisa da cadeia inteira, não só das arestas diretas do titular. */
  listByTenant(tenantId: string): Promise<FamilyRelationship[]>;
  /** Busca pelas duas pontas (em qualquer ordem) para detectar duplicidade simétrica antes de criar. */
  findEquivalent(
    tenantId: string,
    relation: Pick<FamilyRelationship, 'fromKind' | 'fromId' | 'toKind' | 'toId' | 'relationKind'>,
  ): Promise<FamilyRelationship | null>;
  create(entity: FamilyRelationship): Promise<void>;
  update(entity: FamilyRelationship): Promise<void>;
}
