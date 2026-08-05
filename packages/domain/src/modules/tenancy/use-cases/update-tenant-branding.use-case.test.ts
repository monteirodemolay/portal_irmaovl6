import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryTenantBrandingRepository } from '../../../test/fakes';
import type { TenantBranding } from '../entities/tenant-branding.entity';
import { UpdateTenantBrandingUseCase } from './update-tenant-branding.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['branding:manage'],
};

function buildBranding(overrides: Partial<TenantBranding> = {}): TenantBranding {
  return {
    id: 't1',
    tenantId: 't1',
    corPrimaria: '#061C36',
    corSecundaria: '#041223',
    corDestaque: '#D4AF37',
    corFundo: '#F5F7FA',
    tipografia: 'system-ui',
    raioBorda: 16,
    modoEscuroHabilitado: true,
    brasaoUrl: null,
    logotipoUrl: null,
    faviconUrl: null,
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
  const brandingRepository = new InMemoryTenantBrandingRepository();
  const useCase = new UpdateTenantBrandingUseCase({
    brandingRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, brandingRepository };
}

describe('UpdateTenantBrandingUseCase', () => {
  it('aplica o patch preservando os campos não alterados', async () => {
    const { useCase, brandingRepository } = buildUseCase();
    await brandingRepository.create(buildBranding());

    const result = await useCase.execute(ctx, { corPrimaria: '#123456', raioBorda: 8 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.corPrimaria).toBe('#123456');
    expect(result.value.raioBorda).toBe(8);
    expect(result.value.corSecundaria).toBe('#041223');
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('admin-1');

    const persisted = await brandingRepository.findByTenantId('t1');
    expect(persisted?.corPrimaria).toBe('#123456');
  });

  it('rejeita quem não tem permissão branding:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao, { corPrimaria: '#123456' })).rejects.toThrow(
      'Permissão ausente: branding:manage.',
    );
  });

  it('retorna not_found quando a Loja ainda não tem branding cadastrado', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { corPrimaria: '#123456' });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
