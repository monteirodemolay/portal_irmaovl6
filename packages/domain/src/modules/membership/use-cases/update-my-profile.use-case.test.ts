import { describe, expect, it } from 'vitest';
import type { MemberSelfEditValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryMemberRepository } from '../../../test/fakes';
import type { Member } from '../entities/member.entity';
import { UpdateMyProfileUseCase } from './update-my-profile.use-case';

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
  fotoUrl: 'https://blob.example.com/foto.jpg',
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

const input: MemberSelfEditValues = {
  telefone: '11999999999',
  whatsapp: null,
  endereco: null,
  profissao: 'Engenheiro',
  empresa: null,
  estadoCivil: null,
  conjugeNome: null,
  conjugeDataNascimento: null,
  biografia: 'Biografia atualizada.',
  redesSociais: { instagram: null, facebook: null, linkedin: null },
};

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new UpdateMyProfileUseCase({
    memberRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, memberRepository };
}

describe('UpdateMyProfileUseCase', () => {
  it('atualiza o próprio subconjunto de campos de autoatendimento', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(baseMember);

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.profissao).toBe('Engenheiro');
    expect(result.value.biografia).toBe('Biografia atualizada.');
    expect(result.value.nomeCompleto).toBe('Fulano de Tal');
    // Regressão: fotoUrl não faz parte do autoatendimento (a foto é
    // gerenciada só pelo Administrador na 1ª fase) — o autoatendimento
    // nunca pode apagar a foto já cadastrada.
    expect(result.value.fotoUrl).toBe('https://blob.example.com/foto.jpg');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('user-1');

    const stored = await memberRepository.findById('member-1');
    expect(stored?.profissao).toBe('Engenheiro');
  });

  it('retorna NotFoundError quando o usuário não tem registro de Irmão vinculado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, input);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
