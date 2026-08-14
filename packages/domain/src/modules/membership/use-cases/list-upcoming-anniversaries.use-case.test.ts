import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { ListUpcomingAnniversariesUseCase } from './list-upcoming-anniversaries.use-case';

const HOJE = new Date('2026-03-12T12:00:00Z');

const ctx: AuthContext = {
  uid: 'membro-1',
  tenantId: 't1',
  roleId: 'role-membro',
  permissions: ['member:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@example.com',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '001',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'regular',
    lojaId: 't1',
    potencia: 'GOB',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new ListUpcomingAnniversariesUseCase({
    memberRepository,
    clock: new FixedClock(HOJE),
  });
  return { useCase, memberRepository };
}

describe('ListUpcomingAnniversariesUseCase', () => {
  it('inclui um Irmão cuja data de iniciação cai dentro da janela de 7 dias', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ dataIniciacao: new Date('2015-03-12') }));

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      memberId: 'member-1',
      kind: 'iniciacao',
      diasAte: 0,
      anosCompletos: 11,
    });
  });

  it('não inclui datas fora da janela', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ dataIniciacao: new Date('2015-06-01') }));

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('gera uma entrada por data cadastrada, quando várias caem na janela', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        dataIniciacao: new Date('2015-03-12'),
        dataElevacao: new Date('2018-03-14'),
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(2);
    expect(result.map((e) => e.kind).sort()).toEqual(['elevacao', 'iniciacao']);
  });

  it('exclui Irmãos com situação terminal (falecido/transferido)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({ dataIniciacao: new Date('2015-03-12'), situacao: 'falecido' }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('ignora Irmão sem nenhuma data cadastrada', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('ordena por dias até a ocorrência, depois nome', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({ id: 'm1', nomeCompleto: 'Beltrano', dataIniciacao: new Date('2015-03-15') }),
    );
    await memberRepository.create(
      buildMember({ id: 'm2', nomeCompleto: 'Ana', dataIniciacao: new Date('2015-03-12') }),
    );

    const result = await useCase.execute(ctx);

    expect(result.map((e) => e.memberId)).toEqual(['m2', 'm1']);
  });

  it('rejeita quem não tem permissão member:read', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow(
      'Permissão ausente: member:read.',
    );
  });
});
