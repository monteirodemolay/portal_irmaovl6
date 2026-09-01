import type { MemberFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { Member } from '../entities/member.entity';
import type { MemberSituationRecord } from '../entities/member-situation-record.entity';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberSituationRecordRepository } from '../repositories/member-situation-record.repository';

export interface RegisterMemberDeps {
  memberRepository: IMemberRepository;
  situationRecordRepository: IMemberSituationRecordRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastra um novo Irmão. Cadastro simplificado: só `nomeCompleto` e `email`
 * são obrigatórios (`memberSchema`). `cim`, quando informado, precisa ser
 * único por tenant — docs/architecture/06-regras-negocio.md §6.1.
 */
export class RegisterMemberUseCase {
  constructor(private readonly deps: RegisterMemberDeps) {}

  async execute(ctx: AuthContext, input: MemberFormValues): Promise<Result<Member>> {
    requirePermission(ctx, 'member:create');

    if (input.cim) {
      const cimTaken = await this.deps.memberRepository.existsByCim(ctx.tenantId, input.cim);
      if (cimTaken) {
        return err(new ConflictError(`CIM "${input.cim}" já está em uso.`));
      }
    }

    const now = this.deps.clock.now();
    const member: Member = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      userId: null,
      cargoAtualId: null,
      ...input,
      redesSociais: {
        instagram: input.redesSociais.instagram ?? null,
        facebook: input.redesSociais.facebook ?? null,
        linkedin: input.redesSociais.linkedin ?? null,
      },
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.memberRepository.create(member);

    // Todo Irmão nasce com um primeiro registro vigente na Situação
    // Maçônica (situacao já vem 'ativo' em `input`, ver `createMemberAction`)
    // — sem isso o cadastro ficaria com `Member.situacao` preenchido mas
    // nenhum histórico por trás, quebrando a invariante "todo Irmão ativo
    // tem exatamente um registro vigente".
    const record: MemberSituationRecord = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: member.id,
      situacao: member.situacao,
      motivo: member.dataIniciacao ? 'iniciacao' : 'outro',
      motivoOutroDescricao: member.dataIniciacao
        ? null
        : 'Situação inicial registrada no cadastro do Irmão.',
      dataInicio: member.dataIniciacao ?? now,
      dataFim: null,
      lojaId: member.lojaId,
      potencia: member.potencia,
      documentoNumero: null,
      documentoData: null,
      observacoes: null,
      anexos: [],
      vigente: true,
      dataInicioEstimada: false,
      justificativaEdicaoRetroativa: null,
      origem: null,
      sourceCode: null,
      sourceLabel: null,
      recordKind: null,
      lojaOrigemId: null,
      lojaDestinoId: null,
      importBatchId: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.situationRecordRepository.create(record);

    return ok(member);
  }
}
