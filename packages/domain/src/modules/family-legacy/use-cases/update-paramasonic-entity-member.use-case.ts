import type {
  ParamasonicEntityMemberCategory,
  ParamasonicEntityMemberSituation,
} from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, NotFoundError, ValidationError, ok, type Result } from '../../../shared/result';
import type { ParamasonicEntityMember } from '../entities/paramasonic-entity-member.entity';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';
import type { IPersonFraternalRecordRepository } from '../repositories/person-fraternal-record.repository';
import { upsertDemolayFraternalRecord } from '../lib/upsert-demolay-fraternal-record';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberTitleRepository } from '../../honors/repositories/member-title.repository';
import { grantPastPresidenteConselhoConsultivoTitleIfNeeded } from '../../honors/lib/grant-past-presidente-conselho-consultivo-title';

export interface UpdateParamasonicEntityMemberInput {
  id: string;
  /** Só considerado pra integrante do corpo próprio (`memberId === null`). */
  nomeCompleto: string | null;
  contato: string | null;
  cargo: string | null;
  categoria: ParamasonicEntityMemberCategory | null;
  situacao: ParamasonicEntityMemberSituation;
  dataIngresso: Date | null;
  /**
   * Remove a rastreabilidade `conjugeDeMemberId` (ex.: separação/divórcio) —
   * nunca apaga o integrante, que continua fazendo parte do histórico da
   * Fraternidade. Combine com `situacao: 'inativo'` na mesma edição pra
   * marcar "não é mais cônjuge de ninguém e não está mais ativa".
   */
  desvincularDoIrmao?: boolean;
  /**
   * Só considerado quando o integrante tem `memberId` — marca que o Irmão
   * também foi DeMolay ativo nesta entidade, criando/atualizando o vínculo
   * dele em Família e Legado (mesma lógica do cruzamento automático por
   * nome). Exige `familyLegacy:manage` além de `paramasonicEntity:manage`.
   */
  marcarComoExDemolay?: boolean;
  /**
   * Só considerado quando o integrante tem `memberId` — concede o título
   * Past-Presidente do Conselho Consultivo (mesma convenção do Mestre
   * Instalado). Exige `familyLegacy:manage` além de `paramasonicEntity:manage`.
   */
  marcarComoPastPresidenteConselho?: boolean;
}

export interface UpdateParamasonicEntityMemberDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
  memberTitleRepository: IMemberTitleRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Edita um integrante já cadastrado de uma entidade paramaçônica — pedido do
 * Administrador pra poder revisar, um por um, a classificação (categoria) e
 * os casos de Irmãos vinculados que são "Maçom/Tio" no Conselho Consultivo:
 * diferenciar quem também foi DeMolay ativo (vira Afiliação em Família e
 * Legado, `marcarComoExDemolay`) de quem exerceu a Presidência do Conselho
 * Consultivo (vira Título "Past-Presidente do Conselho Consultivo",
 * `marcarComoPastPresidenteConselho`) — as duas coisas não são excludentes,
 * um Irmão pode ter sido as duas.
 */
export class UpdateParamasonicEntityMemberUseCase {
  constructor(private readonly deps: UpdateParamasonicEntityMemberDeps) {}

  async execute(
    ctx: AuthContext,
    input: UpdateParamasonicEntityMemberInput,
  ): Promise<Result<ParamasonicEntityMember>> {
    requirePermission(ctx, 'paramasonicEntity:manage');
    const wantsFamilyLegacyAction =
      Boolean(input.marcarComoExDemolay) || Boolean(input.marcarComoPastPresidenteConselho);
    if (wantsFamilyLegacyAction) {
      requirePermission(ctx, 'familyLegacy:manage');
    }

    const existing = await this.deps.paramasonicEntityMemberRepository.findById(input.id);
    if (!existing || existing.tenantId !== ctx.tenantId || existing.deletedAt) {
      return err(new NotFoundError('ParamasonicEntityMember', input.id));
    }

    if (!existing.memberId && !input.nomeCompleto?.trim()) {
      return err(new ValidationError('Informe o nome do integrante.'));
    }
    if (wantsFamilyLegacyAction && !existing.memberId) {
      return err(
        new ValidationError(
          'Só é possível marcar essas condições para um integrante vinculado a um Irmão cadastrado.',
        ),
      );
    }

    const now = this.deps.clock.now();
    const updated: ParamasonicEntityMember = {
      ...existing,
      nomeCompleto: existing.memberId ? null : input.nomeCompleto!.trim(),
      contato: existing.memberId ? null : input.contato,
      cargo: input.cargo?.trim() || null,
      categoria: input.categoria,
      situacao: input.situacao,
      dataIngresso: input.dataIngresso,
      conjugeDeMemberId: input.desvincularDoIrmao ? null : existing.conjugeDeMemberId,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.paramasonicEntityMemberRepository.update(updated);

    if (existing.memberId && wantsFamilyLegacyAction) {
      const [entity, member] = await Promise.all([
        this.deps.paramasonicEntityRepository.findById(existing.entityId),
        this.deps.memberRepository.findById(existing.memberId),
      ]);
      if (entity && member) {
        if (input.marcarComoExDemolay) {
          await upsertDemolayFraternalRecord(
            {
              personFraternalRecordRepository: this.deps.personFraternalRecordRepository,
              idGenerator: this.deps.idGenerator,
            },
            {
              ctx,
              member,
              entityName: entity.name,
              cargo: updated.cargo,
              now,
              sourceDescription:
                'Marcado manualmente pela Administração ao revisar os integrantes da entidade.',
            },
          );
        }
        if (input.marcarComoPastPresidenteConselho) {
          await grantPastPresidenteConselhoConsultivoTitleIfNeeded(
            {
              memberTitleRepository: this.deps.memberTitleRepository,
              clock: this.deps.clock,
              idGenerator: this.deps.idGenerator,
            },
            {
              tenantId: ctx.tenantId,
              memberId: existing.memberId,
              uid: ctx.uid,
              fundamento: `Presidência do Conselho Consultivo — ${entity.name} (marcado pela Administração).`,
            },
          );
        }
      }
    }

    return ok(updated);
  }
}
