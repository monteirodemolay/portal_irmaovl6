import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryArchiveContributionRepository,
  InMemoryMemberRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { SubmitArchiveContributionUseCase } from './submit-archive-contribution.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

const baseMember: Member = {
  id: 'member-1',
  tenantId: 't1',
  userId: 'user-1',
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
  cargoAtualId: null,
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

function buildUseCase() {
  const archiveContributionRepository = new InMemoryArchiveContributionRepository();
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new SubmitArchiveContributionUseCase({
    archiveContributionRepository,
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, archiveContributionRepository, memberRepository };
}

describe('SubmitArchiveContributionUseCase', () => {
  it('cria a contribuição em moderacaoStatus pendente, vinculada ao Member do usuário', async () => {
    const { useCase, memberRepository, archiveContributionRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    const result = await useCase.execute(ctx, {
      titulo: 'Foto da fundação da Loja',
      descricao: 'Encontrei este registro entre os pertences do meu avô.',
      tipo: 'fotografia',
      arquivoUrl: 'https://blob.example.com/foto.jpg',
      tamanhoBytes: 2048,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('member-1');
    expect(result.value.moderacaoStatus).toBe('pendente');
    expect(result.value.motivoRejeicao).toBeNull();
    expect(result.value.moderadoPor).toBeNull();

    const stored = await archiveContributionRepository.findById(result.value.id);
    expect(stored?.titulo).toBe('Foto da fundação da Loja');
  });

  it('retorna NotFoundError quando o usuário não tem Member vinculado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      titulo: 'Título',
      descricao: 'Descrição',
      tipo: 'memoria',
      arquivoUrl: null,
      tamanhoBytes: null,
    });

    expect(result.ok).toBe(false);
  });
});
