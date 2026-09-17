import { findSimilarName, normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, NotFoundError, ok, type Result } from '../../../shared/result';
import type { PersonFraternalRecord } from '../entities/person-fraternal-record.entity';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';
import type { IPersonFraternalRecordRepository } from '../repositories/person-fraternal-record.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { Member } from '../../membership/entities/member.entity';

export interface CrossReferenceDemolayRosterDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface CrossReferenceDemolayRosterRow {
  nomeCompleto: string;
  status: 'vinculado' | 'já estava vinculado' | 'sem correspondência' | 'revisar';
  /** Só preenchido quando `status === 'revisar'` — nome de um Irmão cadastrado parecido, mas não idêntico. */
  sugestaoNomeParecido?: string | null;
}

const AFFILIATION_KIND = 'demolay';

/**
 * Cruza, por nome, os integrantes do corpo próprio de uma entidade
 * paramaçônica (importados sem `memberId`, ex.: `ImportDemolayChapterRosterUseCase`)
 * contra os Irmãos já cadastrados na VL6 — ex.: alguém que entrou no
 * DeMolay antes de ser iniciado na Maçonaria, e por isso aparece nos dois
 * cadastros com o mesmo nome.
 *
 * Quando encontra o MESMO nome (normalizado) em ambos:
 * 1. Converte o integrante da entidade de "corpo próprio" pra "Irmão
 *    vinculado" (`memberId` preenchido, `nomeCompleto`/`contato` viram
 *    `null` — mesma exclusão mútua de `ParamasonicEntityMember`).
 * 2. Registra (ou atualiza) o vínculo em Família e Legado do próprio Irmão
 *    (`PersonFraternalRecord`, `affiliationKind: 'demolay'`) — pra aparecer
 *    também no perfil dele, com o cargo/situação vindos da entidade.
 *
 * Nunca vincula por nome PARECIDO (só idêntico após normalização) — um
 * nome só um pouco diferente vira `status: 'revisar'`, pro Administrador
 * decidir manualmente. Idempotente: rodar de novo não duplica vínculo nem
 * desfaz o que já foi vinculado.
 */
export class CrossReferenceDemolayRosterUseCase {
  constructor(private readonly deps: CrossReferenceDemolayRosterDeps) {}

  async execute(
    ctx: AuthContext,
    entityId: string,
  ): Promise<Result<CrossReferenceDemolayRosterRow[]>> {
    requirePermission(ctx, 'paramasonicEntity:manage');
    requirePermission(ctx, 'familyLegacy:manage');

    const entity = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!entity || entity.tenantId !== ctx.tenantId || entity.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', entityId));
    }

    const [entityMembers, allMembers] = await Promise.all([
      this.deps.paramasonicEntityMemberRepository.listByEntity(ctx.tenantId, entityId),
      this.loadAllMembers(ctx.tenantId),
    ]);
    const memberByName = new Map(
      allMembers.map((member) => [normalizeNameForSearch(member.nomeCompleto), member]),
    );
    const memberById = new Map(allMembers.map((member) => [member.id, member]));
    const allMemberNames = allMembers.map((member) => member.nomeCompleto);

    const now = this.deps.clock.now();
    const report: CrossReferenceDemolayRosterRow[] = [];

    for (const entry of entityMembers) {
      if (entry.memberId) {
        report.push({
          nomeCompleto: memberById.get(entry.memberId)?.nomeCompleto ?? '—',
          status: 'já estava vinculado',
        });
        continue;
      }
      if (!entry.nomeCompleto) continue;

      const normalized = normalizeNameForSearch(entry.nomeCompleto);
      const member = memberByName.get(normalized);

      if (!member) {
        const suggestion = findSimilarName(entry.nomeCompleto, allMemberNames);
        report.push(
          suggestion
            ? {
                nomeCompleto: entry.nomeCompleto,
                status: 'revisar',
                sugestaoNomeParecido: suggestion,
              }
            : { nomeCompleto: entry.nomeCompleto, status: 'sem correspondência' },
        );
        continue;
      }

      await this.deps.paramasonicEntityMemberRepository.update({
        ...entry,
        memberId: member.id,
        nomeCompleto: null,
        contato: null,
        updatedAt: now,
        updatedBy: ctx.uid,
      });

      await this.upsertFraternalRecord(ctx, member, entity.name, entry.cargo, now);

      report.push({ nomeCompleto: entry.nomeCompleto, status: 'vinculado' });
    }

    return ok(report);
  }

  private async upsertFraternalRecord(
    ctx: AuthContext,
    member: Member,
    entityName: string,
    cargo: string | null,
    now: Date,
  ): Promise<void> {
    const existingRecords = await this.deps.personFraternalRecordRepository.listByPerson(
      ctx.tenantId,
      'member',
      member.id,
    );
    const existing = existingRecords.find(
      (record) =>
        record.affiliationKind === AFFILIATION_KIND && record.organizacaoNome === entityName,
    );

    if (existing) {
      const cargos =
        cargo && !existing.cargos.includes(cargo) ? [...existing.cargos, cargo] : existing.cargos;
      if (cargos !== existing.cargos) {
        await this.deps.personFraternalRecordRepository.update({
          ...existing,
          cargos,
          updatedAt: now,
          updatedBy: ctx.uid,
        });
      }
      return;
    }

    const record: PersonFraternalRecord = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      personKind: 'member',
      personId: member.id,
      affiliationKind: AFFILIATION_KIND,
      organizacaoNome: entityName,
      unidadeTipo: 'chapter',
      unidadeNome: entityName,
      unidadeNumero: null,
      cidade: null,
      estado: null,
      pais: null,
      potencia: null,
      rito: null,
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
      grau: null,
      cargos: cargo ? [cargo] : [],
      titulos: [],
      passouAoOrienteEternoEm: null,
      resumoLegado: null,
      visibility: 'members',
      reviewStatus: 'verified',
      sourceKind: 'official_source',
      sourceDescription:
        'Nominata do Capítulo DeMolay — cruzamento por nome feito pela Administração.',
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.personFraternalRecordRepository.create(record);
  }

  private async loadAllMembers(tenantId: string): Promise<Member[]> {
    const all: Member[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.deps.memberRepository.search({ tenantId }, { limit: 100, cursor });
      all.push(...page.items);
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return all;
  }
}
