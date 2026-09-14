import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, ValidationError } from '../../../shared/result';
import { FixedClock, InMemoryHonorRepository, SequentialIdGenerator } from '../../../test/fakes';
import { RegisterHonorUseCase, type RegisterHonorInput } from './register-honor.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:manage'],
};

const baseInput: RegisterHonorInput = {
  memberId: 'member-1',
  homenageadoNome: null,
  homenageadoLojaOrigem: null,
  homenageadoOriente: null,
  nomeOficial: 'Comenda do Mérito Maçônico',
  tipo: 'comenda',
  instituicaoConcedente: 'Grande Loja Maçônica',
  data: new Date('2020-08-12'),
  numeroAto: 'Decreto nº 102/2020',
  motivo: 'Relevantes serviços prestados à Ordem.',
  descricaoHistorica: null,
  diplomaFileId: null,
  fotoEntregaFileId: null,
};

function buildUseCase() {
  const honorRepository = new InMemoryHonorRepository();
  const useCase = new RegisterHonorUseCase({
    honorRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, honorRepository };
}

describe('RegisterHonorUseCase', () => {
  it('cadastra a honraria de um Irmão cadastrado', async () => {
    const { useCase, honorRepository } = buildUseCase();

    const result = await useCase.execute(ctx, baseInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('member-1');
    expect(result.value.homenageadoNome).toBeNull();
    const stored = await honorRepository.findById(result.value.id);
    expect(stored).not.toBeNull();
  });

  it('cadastra a honraria de um homenageado externo (Membro Honorário de outra Loja)', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      ...baseInput,
      memberId: null,
      homenageadoNome: 'Carlos Menezes',
      homenageadoLojaOrigem: 'Loja Fraternidade nº 12',
      homenageadoOriente: 'Goiânia — GO',
      tipo: 'membro_honorario',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBeNull();
    expect(result.value.homenageadoNome).toBe('Carlos Menezes');
  });

  it('rejeita quando nem memberId nem homenageadoNome são informados', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { ...baseInput, memberId: null });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(ValidationError);
  });

  it('rejeita quando memberId e homenageadoNome vêm preenchidos ao mesmo tempo', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { ...baseInput, homenageadoNome: 'Outro nome' });

    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError quando falta a permissão honor:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, baseInput)).rejects.toThrow(ForbiddenError);
  });
});
