import { normalizeNameForSearch, type FamilyPersonFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ForbiddenError, NotFoundError, err, ok, type Result } from '../../../shared/result';
import type { FamilyPerson } from '../entities/family-person.entity';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';

export interface UpdateFamilyPersonDeps {
  familyPersonRepository: IFamilyPersonRepository;
  clock: IClock;
}

/**
 * Edição de `FamilyPerson` — ação pessoal: só quem gerencia o registro
 * (`managedByMemberId`) pode editar nesta etapa. Cadastro assistido pela
 * administração (edição por outro Irmão) é Etapa 8, fora deste escopo.
 */
export class UpdateFamilyPersonUseCase {
  constructor(private readonly deps: UpdateFamilyPersonDeps) {}

  async execute(
    ctx: AuthContext,
    actingMemberId: string,
    personId: string,
    input: FamilyPersonFormValues,
  ): Promise<Result<FamilyPerson>> {
    const existing = await this.deps.familyPersonRepository.findById(personId);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('FamilyPerson', personId));
    }
    if (existing.managedByMemberId !== actingMemberId) {
      return err(new ForbiddenError('familyLegacy:update-not-owner'));
    }

    const now = this.deps.clock.now();
    const dataNascimento = input.dataNascimento;
    let menorDeIdade = input.menorDeIdade;
    if (dataNascimento) {
      const eighteenthBirthday = new Date(dataNascimento);
      eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
      menorDeIdade = eighteenthBirthday > now;
    }
    const visibility =
      menorDeIdade && input.visibility !== 'administration' ? 'private' : input.visibility;

    const updated: FamilyPerson = {
      ...existing,
      linkedMemberId: input.linkedMemberId,
      nomeCompleto: input.nomeCompleto,
      nomeBusca: normalizeNameForSearch(input.nomeCompleto),
      fotoUrl: input.fotoUrl,
      dataNascimento: input.dataNascimento,
      dataFalecimento: input.dataFalecimento,
      lifeStatus: input.lifeStatus,
      cidade: input.cidade,
      estado: input.estado,
      pais: input.pais,
      biografia: input.biografia,
      menorDeIdade,
      fraternalLinkStatus: input.fraternalLinkStatus,
      visibility,
      sourceKind: input.sourceKind,
      sourceDescription: input.sourceDescription,
      updatedAt: now,
      updatedBy: ctx.uid,
    };

    await this.deps.familyPersonRepository.update(updated);
    return ok(updated);
  }
}
