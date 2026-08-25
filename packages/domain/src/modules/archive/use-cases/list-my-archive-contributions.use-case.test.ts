import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryArchiveContributionRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import type { Member } from '../../membership/entities/member.entity';
import { ListMyArchiveContributionsUseCase } from './list-my-archive-contributions.use-case';

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
  autorizaDivulgacaoExterna: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function makeContribution(overrides: Partial<ArchiveContribution> = {}): ArchiveContribution {
  return {
    id: 'contrib-1',
    tenantId: 't1',
    memberId: 'member-1',
    titulo: 'Título',
    descricao: 'Descrição',
    tipo: 'memoria',
    arquivoUrl: null,
    tamanhoBytes: null,
    moderacaoStatus: 'pendente',
    motivoRejeicao: null,
    moderadoPor: null,
    moderadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListMyArchiveContributionsUseCase', () => {
  it('lista só as contribuições do Member vinculado ao usuário', async () => {
    const archiveContributionRepository = new InMemoryArchiveContributionRepository();
    const memberRepository = new InMemoryMemberRepository();
    await memberRepository.create(baseMember);
    await archiveContributionRepository.create(
      makeContribution({ id: 'c1', memberId: 'member-1' }),
    );
    await archiveContributionRepository.create(
      makeContribution({ id: 'c2', memberId: 'outro-membro' }),
    );

    const useCase = new ListMyArchiveContributionsUseCase({
      archiveContributionRepository,
      memberRepository,
    });
    const result = await useCase.execute(ctx);

    expect(result.map((c) => c.id)).toEqual(['c1']);
  });

  it('retorna lista vazia quando o usuário não tem Member vinculado', async () => {
    const archiveContributionRepository = new InMemoryArchiveContributionRepository();
    const memberRepository = new InMemoryMemberRepository();
    const useCase = new ListMyArchiveContributionsUseCase({
      archiveContributionRepository,
      memberRepository,
    });

    expect(await useCase.execute(ctx)).toEqual([]);
  });
});
