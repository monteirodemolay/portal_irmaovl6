import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { UpdateMyPhotoUseCase } from './update-my-photo.use-case';

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
  const useCase = new UpdateMyPhotoUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository };
}

describe('UpdateMyPhotoUseCase', () => {
  it('atualiza a foto do próprio Member vinculado ao usuário', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    const result = await useCase.execute(ctx, 'https://blob.example.com/nova-foto.jpg');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.fotoUrl).toBe('https://blob.example.com/nova-foto.jpg');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('user-1');

    const stored = await memberRepository.findById('member-1');
    expect(stored?.fotoUrl).toBe('https://blob.example.com/nova-foto.jpg');
  });

  it('retorna NotFoundError quando o usuário não tem registro de Irmão vinculado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'https://blob.example.com/nova-foto.jpg');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
