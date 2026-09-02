import type { FamilyRelationshipFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ForbiddenError, err, ok, type Result } from '../../../shared/result';
import type { FamilyRelationship } from '../entities/family-relationship.entity';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';
import { wouldCreateAncestryCycle, type RelationshipEdge } from '../services/derive-kinships';

export interface CreateFamilyRelationshipDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  familyPersonRepository: IFamilyPersonRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

const SYMMETRIC_RELATION_KINDS = new Set(['spouse_of', 'partner_of', 'sibling_of']);
const ANCESTRY_RELATION_KINDS = new Set(['parent_of', 'adoptive_parent_of']);

function toEdge(relation: FamilyRelationship): RelationshipEdge {
  return {
    id: relation.id,
    from: { kind: relation.fromKind, id: relation.fromId },
    to: { kind: relation.toKind, id: relation.toId },
    relationKind: relation.relationKind,
    parentRole: relation.parentRole,
    childRole: relation.childRole,
  };
}

/**
 * Cria um vínculo familiar direto — ação pessoal (sem `requirePermission`):
 * quem chama precisa ser parte de uma das pontas, seja como o próprio
 * `Member` (`actingMemberId`), seja como responsável por uma `FamilyPerson`
 * que ele mesmo cadastrou (`managedByMemberId`). Essa segunda hipótese é o
 * que permite montar uma cadeia inteira (bisavô -> avô -> mãe -> Luís): a
 * aresta avô->mãe não toca o próprio Luís, mas ele gerencia os dois
 * `FamilyPerson`s envolvidos. Continua impedindo escrever na rede familiar
 * de OUTRO Irmão (regra não-negociável do pacote de implantação) — nenhuma
 * ponta gerenciada por outro `Member` passa nesse teste.
 * Aplica as regras de integridade de 03_ARQUITETURA_E_DADOS.md: sem
 * autorrelação (já barrado pelo schema Zod, revalidado aqui), sem aresta
 * duplicada simétrica, sem ciclo de ascendência.
 */
export class CreateFamilyRelationshipUseCase {
  constructor(private readonly deps: CreateFamilyRelationshipDeps) {}

  async execute(
    ctx: AuthContext,
    actingMemberId: string,
    input: FamilyRelationshipFormValues,
  ): Promise<Result<FamilyRelationship>> {
    const isParty = await this.isActingMemberAParty(ctx, actingMemberId, input);
    if (!isParty) {
      return err(new ForbiddenError('familyLegacy:not-a-party'));
    }

    if (input.fromKind === input.toKind && input.fromId === input.toId) {
      return err(new ConflictError('Uma pessoa não pode possuir vínculo familiar consigo mesma.'));
    }

    const existingEquivalent = await this.deps.familyRelationshipRepository.findEquivalent(
      ctx.tenantId,
      {
        fromKind: input.fromKind,
        fromId: input.fromId,
        toKind: input.toKind,
        toId: input.toId,
        relationKind: input.relationKind,
      },
    );
    if (existingEquivalent) {
      return err(new ConflictError('Esse vínculo familiar já está registrado.'));
    }

    if (SYMMETRIC_RELATION_KINDS.has(input.relationKind)) {
      const inverse = await this.deps.familyRelationshipRepository.findEquivalent(ctx.tenantId, {
        fromKind: input.toKind,
        fromId: input.toId,
        toKind: input.fromKind,
        toId: input.fromId,
        relationKind: input.relationKind,
      });
      if (inverse) {
        return err(
          new ConflictError('Esse vínculo familiar já está registrado (em ordem invertida).'),
        );
      }
    }

    if (ANCESTRY_RELATION_KINDS.has(input.relationKind)) {
      const allRelations = await this.deps.familyRelationshipRepository.listByTenant(ctx.tenantId);
      const cycle = wouldCreateAncestryCycle(
        { kind: input.fromKind, id: input.fromId },
        { kind: input.toKind, id: input.toId },
        allRelations.map(toEdge),
      );
      if (cycle) {
        return err(new ConflictError('Esse vínculo criaria um ciclo de ascendência.'));
      }
    }

    // Confirmação entre Irmãos: só faz sentido quando as duas pontas são
    // `Member` — pessoa histórica ou externa (`familyPerson`) não pode
    // confirmar nada, então o vínculo já nasce `not_required`
    // (03_ARQUITETURA_E_DADOS.md — "permite pessoa histórica sem confirmação").
    const requiresConfirmation = input.fromKind === 'member' && input.toKind === 'member';

    const now = this.deps.clock.now();
    const relation: FamilyRelationship = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      fromKind: input.fromKind,
      fromId: input.fromId,
      toKind: input.toKind,
      toId: input.toId,
      relationKind: input.relationKind,
      parentRole: input.parentRole,
      childRole: input.childRole,
      declaredLabel: input.declaredLabel,
      lineageSide:
        input.parentRole === 'mae'
          ? 'maternal'
          : input.parentRole === 'pai'
            ? 'paternal'
            : 'unknown',
      confirmationStatus: requiresConfirmation ? 'pending' : 'not_required',
      confirmedAt: null,
      confirmedBy: null,
      confirmationNote: null,
      visibility: input.visibility,
      reviewStatus: 'draft',
      sourceKind: input.sourceKind,
      sourceDescription: input.sourceDescription,
      validFrom: null,
      validTo: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.familyRelationshipRepository.create(relation);
    return ok(relation);
  }

  private async isActingMemberAParty(
    ctx: AuthContext,
    actingMemberId: string,
    input: FamilyRelationshipFormValues,
  ): Promise<boolean> {
    if (input.fromKind === 'member' && input.fromId === actingMemberId) return true;
    if (input.toKind === 'member' && input.toId === actingMemberId) return true;

    const familyPersonEndpointIds = [
      input.fromKind === 'familyPerson' ? input.fromId : null,
      input.toKind === 'familyPerson' ? input.toId : null,
    ].filter((id): id is string => id !== null);

    for (const id of familyPersonEndpointIds) {
      const person = await this.deps.familyPersonRepository.findById(id);
      if (
        person &&
        person.tenantId === ctx.tenantId &&
        person.managedByMemberId === actingMemberId
      ) {
        return true;
      }
    }

    return false;
  }
}
