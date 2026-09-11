import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { ListDuplicateMembersUseCase } from './list-duplicate-members.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['member:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Ivan Damasceno',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    dataFalecimento: null,
    mensagemHomenagem: null,
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
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListDuplicateMembersUseCase', () => {
  it('agrupa Irmãos com o mesmo nome normalizado', async () => {
    const memberRepository = new InMemoryMemberRepository();
    await memberRepository.create(
      buildMember({ id: 'm1', nomeCompleto: 'Ivan Damasceno', createdAt: new Date('2020-01-01') }),
    );
    await memberRepository.create(
      buildMember({ id: 'm2', nomeCompleto: 'IVAN DAMASCENO', createdAt: new Date('2021-01-01') }),
    );
    await memberRepository.create(
      buildMember({ id: 'm3', nomeCompleto: 'Ivan Damasceno', createdAt: new Date('2019-01-01') }),
    );
    await memberRepository.create(buildMember({ id: 'm4', nomeCompleto: 'Outro Irmão' }));

    const useCase = new ListDuplicateMembersUseCase({ memberRepository });
    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(1);
    const group = result.value[0]!;
    expect(group.membros).toHaveLength(3);
    // ordenados por createdAt crescente — o mais antigo primeiro
    expect(group.membros.map((m) => m.id)).toEqual(['m3', 'm1', 'm2']);
  });

  it('ignora cadastros já excluídos (deletedAt)', async () => {
    const memberRepository = new InMemoryMemberRepository();
    await memberRepository.create(buildMember({ id: 'm1', nomeCompleto: 'Ivan Damasceno' }));
    await memberRepository.create(
      buildMember({ id: 'm2', nomeCompleto: 'Ivan Damasceno', deletedAt: new Date('2022-01-01') }),
    );

    const useCase = new ListDuplicateMembersUseCase({ memberRepository });
    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  it('recusa sem permissão', async () => {
    const memberRepository = new InMemoryMemberRepository();
    const useCase = new ListDuplicateMembersUseCase({ memberRepository });
    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow();
  });
});
