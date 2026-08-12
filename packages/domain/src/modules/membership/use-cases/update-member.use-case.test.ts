import { describe, expect, it } from 'vitest';
import type { MemberFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { UpdateMemberUseCase } from './update-member.use-case';

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

const baseMember: Member = {
  id: 'member-1',
  tenantId: 't1',
  userId: null,
  nomeCompleto: 'Fulano de Tal',
  nomeMaconico: null,
  fotoUrl: null,
  email: 'fulano@vl6.org.br',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  dataIniciacao: null,
  dataElevacao: null,
  dataExaltacao: null,
  cim: null,
  matricula: '123',
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

const outroMember: Member = { ...baseMember, id: 'member-2', matricula: '456' };

const input: MemberFormValues = {
  nomeCompleto: 'Fulano de Tal Editado',
  nomeMaconico: 'Fulano',
  fotoUrl: null,
  email: 'fulano@vl6.org.br',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  dataIniciacao: null,
  dataElevacao: null,
  dataExaltacao: null,
  cim: null,
  matricula: '123',
  grau: 'mestre',
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
};

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new UpdateMemberUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository };
}

describe('UpdateMemberUseCase', () => {
  it('atualiza os dados do Irmão mantendo a matrícula', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    const result = await useCase.execute(ctx, 'member-1', input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nomeCompleto).toBe('Fulano de Tal Editado');
    expect(result.value.nomeMaconico).toBe('Fulano');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));

    const stored = await memberRepository.findById('member-1');
    expect(stored?.nomeCompleto).toBe('Fulano de Tal Editado');
  });

  it('lança ForbiddenError quando falta a permissão member:update', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    await expect(useCase.execute(readOnlyCtx, 'member-1', input)).rejects.toThrow(ForbiddenError);
  });

  it('retorna NotFoundError quando o Irmão não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });

  it('rejeita troca para uma matrícula já usada por outro Irmão', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);
    await memberRepository.create(outroMember);

    const result = await useCase.execute(ctx, 'member-1', { ...input, matricula: '456' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
