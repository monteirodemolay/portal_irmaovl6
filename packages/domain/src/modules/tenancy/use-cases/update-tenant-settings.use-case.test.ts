import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryTenantSettingsRepository } from '../../../test/fakes';
import type { TenantSettings } from '../entities/tenant-settings.entity';
import { UpdateTenantSettingsUseCase } from './update-tenant-settings.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['tenant:manage'],
};

function buildSettings(overrides: Partial<TenantSettings> = {}): TenantSettings {
  return {
    id: 't1',
    tenantId: 't1',
    idiomaPadrao: 'pt-BR',
    textosInstitucionais: {},
    itensMenu: [],
    rodape: { textoDireitosAutorais: '', links: [] },
    integracoesHabilitadas: [],
    citacaoRotacao: { modo: 'diaria', intervaloMinutos: null },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const settingsRepository = new InMemoryTenantSettingsRepository();
  const useCase = new UpdateTenantSettingsUseCase({
    settingsRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, settingsRepository };
}

describe('UpdateTenantSettingsUseCase', () => {
  it('altera o idioma preservando os demais campos', async () => {
    const { useCase, settingsRepository } = buildUseCase();
    await settingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, { idiomaPadrao: 'en' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.idiomaPadrao).toBe('en');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('admin-1');

    const persisted = await settingsRepository.findByTenantId('t1');
    expect(persisted?.idiomaPadrao).toBe('en');
  });

  it('rejeita quem não tem permissão tenant:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao, { idiomaPadrao: 'en' })).rejects.toThrow(
      'Permissão ausente: tenant:manage.',
    );
  });

  it('retorna not_found quando a Loja ainda não tem settings cadastrado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { idiomaPadrao: 'en' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
