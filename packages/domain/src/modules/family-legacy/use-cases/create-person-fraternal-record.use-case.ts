import type { PersonFraternalRecordFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { PersonFraternalRecord } from '../entities/person-fraternal-record.entity';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IPersonFraternalRecordRepository } from '../repositories/person-fraternal-record.repository';

export interface CreatePersonFraternalRecordDeps {
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
  familyPersonRepository: IFamilyPersonRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Registra uma trajetória maçônica ou paramaçônica — uma pessoa pode ter
 * vários registros (Loja + Capítulo DeMolay, por exemplo), cada chamada cria
 * um novo, nunca substitui o anterior. Ação pessoal: só quem gerencia a
 * `FamilyPerson` (ou o próprio `Member`) pode registrar.
 */
export class CreatePersonFraternalRecordUseCase {
  constructor(private readonly deps: CreatePersonFraternalRecordDeps) {}

  async execute(
    ctx: AuthContext,
    actingMemberId: string,
    input: PersonFraternalRecordFormValues,
  ): Promise<Result<PersonFraternalRecord>> {
    if (input.personKind === 'member') {
      if (input.personId !== actingMemberId) {
        return err(new ForbiddenError('familyLegacy:not-a-party'));
      }
    } else {
      const person = await this.deps.familyPersonRepository.findById(input.personId);
      if (!person || person.tenantId !== ctx.tenantId || person.deletedAt) {
        return err(new NotFoundError('FamilyPerson', input.personId));
      }
      if (person.managedByMemberId !== actingMemberId) {
        return err(new ForbiddenError('familyLegacy:not-a-party'));
      }
    }

    const now = this.deps.clock.now();
    const record: PersonFraternalRecord = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.personFraternalRecordRepository.create(record);
    return ok(record);
  }
}
