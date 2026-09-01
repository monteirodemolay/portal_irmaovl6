import type { MemberCentralProfileValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IAuditLogRepository } from '../../audit/repositories/audit-log.repository';
import { RecordAuditEntryUseCase } from '../../audit/use-cases/record-audit-entry.use-case';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import { reconcileNegociosStatus } from './update-central-profile.use-case';

export interface UpdateMemberCentralProfileAssistedDeps {
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  memberRepository: IMemberRepository;
  auditLogRepository: IAuditLogRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * "Cadastro assistido" — a Administração preenche o conteúdo voluntário da
 * Central EM NOME de um Irmão (Fase 2, docs/architecture). Caminho paralelo
 * e deliberadamente distinto de `UpdateCentralProfileUseCase`: aqui
 * `memberId` é sempre um INPUT explícito (nunca resolvido de `ctx.uid` via
 * `findByUserId`), e a permissão exigida é `memberCentral:manage` — não
 * `memberCentral:update` — porque `hasPermission` já trata `manage` como
 * superset de qualquer ação do recurso (`auth-context.ts`), então não há
 * necessidade de uma chave RBAC nova só para isto.
 *
 * NUNCA liga `PublicationSettings.profilePublished`/`blocks` — preenchido
 * aqui é sempre rascunho (`draft`) até um consentimento ser registrado e uma
 * publicação de blocos explícita acontecer (`PublishMemberProfileBlocksUseCase`).
 * Reaproveita `reconcileNegociosStatus` (mesma regra: negócio novo/alterado
 * sempre volta para `pending_review`, mesmo preenchido pela Administração).
 */
export class UpdateMemberCentralProfileAssistedUseCase {
  private readonly recordAuditEntry: RecordAuditEntryUseCase;

  constructor(private readonly deps: UpdateMemberCentralProfileAssistedDeps) {
    this.recordAuditEntry = new RecordAuditEntryUseCase(deps);
  }

  async execute(
    ctx: AuthContext,
    memberId: string,
    input: MemberCentralProfileValues,
  ): Promise<Result<MemberCentralProfile>> {
    requirePermission(ctx, 'memberCentral:manage');

    const member = await this.deps.memberRepository.findById(memberId);
    if (!member || member.tenantId !== ctx.tenantId || member.deletedAt) {
      return err(new NotFoundError('Member', memberId));
    }

    const current = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    const now = this.deps.clock.now();
    const negocios = reconcileNegociosStatus(input.negocios, current?.negocios ?? [], now);

    const updated: MemberCentralProfile = current
      ? { ...current, ...input, negocios, updatedAt: now, updatedBy: ctx.uid }
      : {
          id: this.deps.idGenerator.next(),
          tenantId: ctx.tenantId,
          memberId: member.id,
          ...input,
          negocios,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        };

    if (current) {
      await this.deps.memberCentralProfileRepository.update(updated);
    } else {
      await this.deps.memberCentralProfileRepository.create(updated);
    }

    await this.recordAuditEntry.execute({
      tenantId: ctx.tenantId,
      entidade: 'memberCentralProfiles',
      entidadeId: updated.id,
      acao: current ? 'member_profile_assisted_updated' : 'member_profile_assisted_started',
      usuarioId: ctx.uid,
      ip: null,
      dispositivo: null,
      valorAnterior: current,
      valorNovo: updated,
    });

    return ok(updated);
  }
}
