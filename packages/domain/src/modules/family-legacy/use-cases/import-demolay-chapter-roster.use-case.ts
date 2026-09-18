import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { ParamasonicEntityMember } from '../entities/paramasonic-entity-member.entity';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';
import { formatDemolayCargoLabel } from '../lib/format-demolay-cargo-label';
import type { DemolayRosterRow } from '../lib/demolay-roster.types';

const INACTIVE_STATUSES = new Set(['Inativo', 'Falecido']);

export interface ImportDemolayChapterRosterDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface ImportDemolayChapterRosterRow {
  nomeCompleto: string;
  status: 'criado' | 'já existia';
}

/**
 * Importação única da nominata de um Capítulo DeMolay (fornecida pela
 * Administração como planilha) — cria cada integrante como corpo próprio
 * da `ParamasonicEntity` informada (`memberId: null`). Idempotente: rodar
 * de novo não duplica ninguém, casado por nome (normalizado) contra quem já
 * está cadastrado ali, mesmo padrão de `ImportHistoricalBoardTermsUseCase`.
 *
 * Não cruza com `Member` (Irmãos já cadastrados na VL6) — mesmo sabendo que
 * alguns destes DeMolays também são Maçons (tipicamente marcados como
 * "Sênior"/"Sênior/Consultor" na planilha, embora isso possa variar), essa
 * identificação pessoa-a-pessoa fica pra uma etapa seguinte, quando a
 * Administração levantar quem é quem — decisão explícita, não uma
 * limitação técnica.
 */
export class ImportDemolayChapterRosterUseCase {
  constructor(private readonly deps: ImportDemolayChapterRosterDeps) {}

  async execute(
    ctx: AuthContext,
    entityId: string,
    rows: DemolayRosterRow[],
  ): Promise<Result<ImportDemolayChapterRosterRow[]>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const entity = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!entity || entity.tenantId !== ctx.tenantId || entity.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', entityId));
    }

    const existing = await this.deps.paramasonicEntityMemberRepository.listByEntity(
      ctx.tenantId,
      entityId,
    );
    const existingNormalizedNames = new Set(
      existing
        .filter((m) => m.memberId === null && m.nomeCompleto)
        .map((m) => normalizeNameForSearch(m.nomeCompleto!)),
    );

    const now = this.deps.clock.now();
    const report: ImportDemolayChapterRosterRow[] = [];
    const writes: Array<Promise<void>> = [];

    for (const row of rows) {
      const normalized = normalizeNameForSearch(row.nomeCompleto);
      if (existingNormalizedNames.has(normalized)) {
        report.push({ nomeCompleto: row.nomeCompleto, status: 'já existia' });
        continue;
      }
      existingNormalizedNames.add(normalized);

      const member: ParamasonicEntityMember = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        entityId,
        memberId: null,
        nomeCompleto: row.nomeCompleto,
        contato: null,
        cargo: formatDemolayCargoLabel(row),
        categoria: null,
        situacao: INACTIVE_STATUSES.has(row.status) ? 'inativo' : 'ativo',
        dataIngresso: null,
        conjugeDeMemberId: null,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      writes.push(this.deps.paramasonicEntityMemberRepository.create(member));
      report.push({ nomeCompleto: row.nomeCompleto, status: 'criado' });
    }

    await Promise.all(writes);
    return ok(report);
  }
}
