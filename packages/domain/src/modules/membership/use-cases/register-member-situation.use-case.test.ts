import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
  InMemoryMemberSituationRecordRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { RegisterMemberSituationUseCase } from './register-member-situation.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:update'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@vl6.org.br',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: new Date('2015-10-21T00:00:00Z'),
    dataElevacao: null,
    dataExaltacao: null,
    cim: '123',
    grau: 'mestre',
    cargoAtualId: 'cargo-1',
    situacao: 'ativo',
    lojaId: 't1',
    potencia: 'GLEG',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    createdAt: new Date('2015-10-21T00:00:00Z'),
    updatedAt: new Date('2015-10-21T00:00:00Z'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase(member: Member) {
  const memberRepository = new InMemoryMemberRepository();
  memberRepository.create(member);
  const situationRecordRepository = new InMemoryMemberSituationRecordRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const useCase = new RegisterMemberSituationUseCase({
    memberRepository,
    situationRecordRepository,
    positionHistoryRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, memberRepository, situationRecordRepository, positionHistoryRepository };
}

describe('RegisterMemberSituationUseCase', () => {
  it('registra o Quite-Placet, encerra o registro vigente e atualiza Member.situacao', async () => {
    const member = buildMember();
    const { useCase, memberRepository, situationRecordRepository } = buildUseCase(member);

    const vigenteAnterior = {
      id: 'rec-1',
      tenantId: 't1',
      memberId: 'm1',
      situacao: 'ativo' as const,
      motivo: 'iniciacao',
      motivoOutroDescricao: null,
      dataInicio: new Date('2015-10-21T00:00:00Z'),
      dataFim: null,
      lojaId: 't1',
      potencia: 'GLEG',
      documentoNumero: null,
      documentoData: null,
      observacoes: null,
      anexos: [],
      vigente: true,
      dataInicioEstimada: false,
      justificativaEdicaoRetroativa: null,
      createdAt: new Date('2015-10-21T00:00:00Z'),
      updatedAt: new Date('2015-10-21T00:00:00Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active' as const,
      ativo: true,
    };
    await situationRecordRepository.create(vigenteAnterior);

    const result = await useCase.execute(ctx, 'm1', {
      situacao: 'desligado',
      motivo: 'quite_placet',
      dataInicio: new Date('2023-03-15T00:00:00Z'),
      documentoNumero: '012/2023',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.record.situacao).toBe('desligado');
    expect(result.value.record.vigente).toBe(true);
    expect(result.value.member.situacao).toBe('desligado');
    expect(result.value.member.cargoAtualId).toBeNull();

    const anterior = await situationRecordRepository.findById('rec-1');
    expect(anterior?.vigente).toBe(false);
    expect(anterior?.dataFim).toEqual(new Date('2023-03-15T00:00:00Z'));

    const stored = await memberRepository.findById('m1');
    expect(stored?.situacao).toBe('desligado');
  });

  it('permite o retorno do Irmão preservando o Quite-Placet no histórico', async () => {
    const member = buildMember({ situacao: 'desligado', cargoAtualId: null });
    const { useCase, situationRecordRepository } = buildUseCase(member);

    await situationRecordRepository.create({
      id: 'rec-quite-placet',
      tenantId: 't1',
      memberId: 'm1',
      situacao: 'desligado',
      motivo: 'quite_placet',
      motivoOutroDescricao: null,
      dataInicio: new Date('2023-03-15T00:00:00Z'),
      dataFim: null,
      lojaId: 't1',
      potencia: 'GLEG',
      documentoNumero: '012/2023',
      documentoData: null,
      observacoes: null,
      anexos: [],
      vigente: true,
      dataInicioEstimada: false,
      justificativaEdicaoRetroativa: null,
      createdAt: new Date('2023-03-15T00:00:00Z'),
      updatedAt: new Date('2023-03-15T00:00:00Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'm1', {
      situacao: 'ativo',
      motivo: 'regularizacao',
      dataInicio: new Date('2026-08-09T00:00:00Z'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.member.situacao).toBe('ativo');

    const quitePlacet = await situationRecordRepository.findById('rec-quite-placet');
    expect(quitePlacet?.situacao).toBe('desligado');
    expect(quitePlacet?.motivo).toBe('quite_placet');
    expect(quitePlacet?.vigente).toBe(false);
    expect(quitePlacet?.dataFim).toEqual(new Date('2026-08-09T00:00:00Z'));

    const historico = await situationRecordRepository.listByMemberId('m1');
    expect(historico).toHaveLength(2);
  });

  it('rejeita motivo fora da lista da situação', async () => {
    const { useCase } = buildUseCase(buildMember());

    const result = await useCase.execute(ctx, 'm1', {
      situacao: 'licenciado',
      motivo: 'quite_placet',
      dataInicio: new Date('2026-08-10T00:00:00Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('exige descrição quando o motivo é "outro"', async () => {
    const { useCase } = buildUseCase(buildMember());

    const result = await useCase.execute(ctx, 'm1', {
      situacao: 'licenciado',
      motivo: 'outro',
      dataInicio: new Date('2026-08-10T00:00:00Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation');
  });

  it('rejeita nova situação com data anterior à situação vigente', async () => {
    const { useCase, situationRecordRepository } = buildUseCase(buildMember());
    await situationRecordRepository.create({
      id: 'rec-1',
      tenantId: 't1',
      memberId: 'm1',
      situacao: 'ativo',
      motivo: 'iniciacao',
      motivoOutroDescricao: null,
      dataInicio: new Date('2026-01-01T00:00:00Z'),
      dataFim: null,
      lojaId: 't1',
      potencia: 'GLEG',
      documentoNumero: null,
      documentoData: null,
      observacoes: null,
      anexos: [],
      vigente: true,
      dataInicioEstimada: false,
      justificativaEdicaoRetroativa: null,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
      createdBy: 'admin-1',
      updatedBy: 'admin-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'm1', {
      situacao: 'suspenso',
      motivo: 'outro',
      motivoOutroDescricao: 'teste',
      dataInicio: new Date('2025-12-01T00:00:00Z'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('lança ForbiddenError quando falta a permissão member:update', async () => {
    const { useCase } = buildUseCase(buildMember());

    await expect(
      useCase.execute(readOnlyCtx, 'm1', {
        situacao: 'licenciado',
        motivo: 'licenca_saude',
        dataInicio: new Date('2026-08-10T00:00:00Z'),
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
