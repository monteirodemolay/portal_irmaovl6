import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { PersonFraternalRecord } from '../entities/person-fraternal-record.entity';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../repositories/family-relationship.repository';
import type { IPersonFraternalRecordRepository } from '../repositories/person-fraternal-record.repository';

export interface BackfillFraternidadeFemininaDeps {
  familyRelationshipRepository: IFamilyRelationshipRepository;
  familyPersonRepository: IFamilyPersonRepository;
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface BackfillFraternidadeFemininaResult {
  totalConjuges: number;
  corrigidos: { familyPersonId: string; nomeCompleto: string }[];
}

const SPOUSAL_RELATION_KINDS = new Set(['spouse_of', 'partner_of']);

/**
 * Correção retroativa da regra institucional "toda esposa de Irmão é da
 * Fraternidade Feminina" (ver `CreateFamilyRelationshipUseCase`, que já
 * aplica isso em todo vínculo conjugal criado a partir de agora) — cobre os
 * vínculos `spouse_of`/`partner_of` já existentes de antes dessa regra.
 * Idempotente e seguro rodar quantas vezes for preciso: só cria o registro
 * de afiliação pra quem ainda não tem nenhum `female_fraternity`.
 */
export class BackfillFraternidadeFemininaUseCase {
  constructor(private readonly deps: BackfillFraternidadeFemininaDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BackfillFraternidadeFemininaResult>> {
    requirePermission(ctx, 'familyLegacy:manage');

    const allRelations = await this.deps.familyRelationshipRepository.listByTenant(ctx.tenantId);
    const spousalPairs = allRelations
      .filter((r) => !r.deletedAt && SPOUSAL_RELATION_KINDS.has(r.relationKind))
      .map((r) => {
        if (r.fromKind === 'member' && r.toKind === 'familyPerson') {
          return { familyPersonId: r.toId, visibility: r.visibility };
        }
        if (r.toKind === 'member' && r.fromKind === 'familyPerson') {
          return { familyPersonId: r.fromId, visibility: r.visibility };
        }
        return null;
      })
      .filter(
        (
          pair,
        ): pair is {
          familyPersonId: string;
          visibility: (typeof allRelations)[number]['visibility'];
        } => pair !== null,
      );

    // Uma mesma esposa pode aparecer em mais de um vínculo conjugal
    // histórico (raro, mas possível) — corrige só uma vez.
    const uniqueByFamilyPersonId = new Map(spousalPairs.map((pair) => [pair.familyPersonId, pair]));

    const now = this.deps.clock.now();
    const corrigidos: BackfillFraternidadeFemininaResult['corrigidos'] = [];

    for (const { familyPersonId, visibility } of uniqueByFamilyPersonId.values()) {
      const existing = await this.deps.personFraternalRecordRepository.listByPerson(
        ctx.tenantId,
        'familyPerson',
        familyPersonId,
      );
      if (existing.some((record) => record.affiliationKind === 'female_fraternity')) continue;

      const person = await this.deps.familyPersonRepository.findById(familyPersonId);
      if (!person || person.tenantId !== ctx.tenantId) continue;

      const record: PersonFraternalRecord = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        personKind: 'familyPerson',
        personId: familyPersonId,
        affiliationKind: 'female_fraternity',
        organizacaoNome: null,
        unidadeTipo: 'fraternity',
        unidadeNome: null,
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
        cargos: [],
        titulos: [],
        passouAoOrienteEternoEm: null,
        resumoLegado: null,
        visibility,
        reviewStatus: 'draft',
        sourceKind: 'lodge_record',
        sourceDescription: 'Gerado automaticamente: cônjuge de Irmão cadastrado na Loja.',
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.personFraternalRecordRepository.create(record);
      corrigidos.push({ familyPersonId, nomeCompleto: person.nomeCompleto });
    }

    return ok({ totalConjuges: uniqueByFamilyPersonId.size, corrigidos });
  }
}
