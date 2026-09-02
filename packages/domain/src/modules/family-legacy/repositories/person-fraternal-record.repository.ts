import type { FamilyPersonRefKind } from '@vl6/shared';
import type { PersonFraternalRecord } from '../entities/person-fraternal-record.entity';

export interface IPersonFraternalRecordRepository {
  findById(id: string): Promise<PersonFraternalRecord | null>;
  listByPerson(
    tenantId: string,
    kind: FamilyPersonRefKind,
    id: string,
  ): Promise<PersonFraternalRecord[]>;
  create(entity: PersonFraternalRecord): Promise<void>;
  update(entity: PersonFraternalRecord): Promise<void>;
}
