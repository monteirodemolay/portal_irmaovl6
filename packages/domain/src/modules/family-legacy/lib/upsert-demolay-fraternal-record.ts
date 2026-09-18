import type { AuthContext } from '../../../shared/auth-context';
import type { IIdGenerator } from '../../../shared/ports';
import type { Member } from '../../membership/entities/member.entity';
import type { PersonFraternalRecord } from '../entities/person-fraternal-record.entity';
import type { IPersonFraternalRecordRepository } from '../repositories/person-fraternal-record.repository';

const AFFILIATION_KIND = 'demolay';

export interface UpsertDemolayFraternalRecordDeps {
  personFraternalRecordRepository: IPersonFraternalRecordRepository;
  idGenerator: IIdGenerator;
}

export interface UpsertDemolayFraternalRecordParams {
  ctx: AuthContext;
  member: Member;
  entityName: string;
  cargo: string | null;
  now: Date;
  sourceDescription: string;
}

/**
 * Cria ou atualiza o registro de afiliação DeMolay de um Irmão em Família e
 * Legado (`PersonFraternalRecord`, `affiliationKind: 'demolay'`) — usado
 * tanto pelo cruzamento automático por nome (`CrossReferenceDemolayRosterUseCase`)
 * quanto pela marcação manual "também foi DeMolay" na edição de um
 * integrante (`UpdateParamasonicEntityMemberUseCase`). Idempotente: nunca
 * duplica o registro, só acrescenta o cargo se ele ainda não estiver lá.
 */
export async function upsertDemolayFraternalRecord(
  deps: UpsertDemolayFraternalRecordDeps,
  params: UpsertDemolayFraternalRecordParams,
): Promise<void> {
  const existingRecords = await deps.personFraternalRecordRepository.listByPerson(
    params.ctx.tenantId,
    'member',
    params.member.id,
  );
  const existing = existingRecords.find(
    (record) =>
      record.affiliationKind === AFFILIATION_KIND && record.organizacaoNome === params.entityName,
  );

  if (existing) {
    const cargos =
      params.cargo && !existing.cargos.includes(params.cargo)
        ? [...existing.cargos, params.cargo]
        : existing.cargos;
    if (cargos !== existing.cargos) {
      await deps.personFraternalRecordRepository.update({
        ...existing,
        cargos,
        updatedAt: params.now,
        updatedBy: params.ctx.uid,
      });
    }
    return;
  }

  const record: PersonFraternalRecord = {
    id: deps.idGenerator.next(),
    tenantId: params.ctx.tenantId,
    personKind: 'member',
    personId: params.member.id,
    affiliationKind: AFFILIATION_KIND,
    organizacaoNome: params.entityName,
    unidadeTipo: 'chapter',
    unidadeNome: params.entityName,
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
    cargos: params.cargo ? [params.cargo] : [],
    titulos: [],
    passouAoOrienteEternoEm: null,
    resumoLegado: null,
    visibility: 'members',
    reviewStatus: 'verified',
    sourceKind: 'official_source',
    sourceDescription: params.sourceDescription,
    createdAt: params.now,
    updatedAt: params.now,
    createdBy: params.ctx.uid,
    updatedBy: params.ctx.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
  await deps.personFraternalRecordRepository.create(record);
}
