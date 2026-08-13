import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import type { MemberPositionHistory } from '../entities/member-position-history.entity';
import { UpdateMemberSituationUseCase } from './update-member-situation.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

const baseMember: Member = {
  id: 'member-1',
  tenantId: 't1',
  userId: null,
  nomeCompleto: 'Fulano de Tal',
  fotoUrl: null,
  email: 'fulano@vl6.org.br',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  dataIniciacao: null,
  dataElevacao: null,
  dataExaltacao: null,
  cim: '123',
  grau: 'mestre',
  cargoAtualId: 'position-1',
  situacao: 'regular',
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
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

const activePosition: MemberPositionHistory = {
  id: 'position-1',
  tenantId: 't1',
  memberId: 'member-1',
  cargo: 'secretario',
  gestaoId: 'term-1',
  dataInicio: new Date('2025-01-01'),
  dataFim: null,
  observacoes: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const useCase = new UpdateMemberSituationUseCase({
    memberRepository,
    positionHistoryRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository, positionHistoryRepository };
}

describe('UpdateMemberSituationUseCase', () => {
  it('encerra o cargo ativo quando a situação vira falecido', async () => {
    const { useCase, memberRepository, positionHistoryRepository } = buildUseCase();
    await memberRepository.create(baseMember);
    await positionHistoryRepository.create(activePosition);

    const result = await useCase.execute(ctx, 'member-1', 'falecido');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.situacao).toBe('falecido');
    expect(result.value.cargoAtualId).toBeNull();

    const closed = await positionHistoryRepository.findActiveByMemberId('member-1');
    expect(closed).toBeNull();
  });

  it('não mexe no cargo quando a nova situação não é terminal', async () => {
    const { useCase, memberRepository, positionHistoryRepository } = buildUseCase();
    await memberRepository.create(baseMember);
    await positionHistoryRepository.create(activePosition);

    const result = await useCase.execute(ctx, 'member-1', 'irregular');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cargoAtualId).toBe('position-1');

    const stillActive = await positionHistoryRepository.findActiveByMemberId('member-1');
    expect(stillActive).not.toBeNull();
  });
});
