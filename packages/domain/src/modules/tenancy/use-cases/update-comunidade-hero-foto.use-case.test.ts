import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryTenantRepository } from '../../../test/fakes';
import type { Tenant } from '../entities/tenant.entity';
import { UpdateComunidadeHeroFotoUseCase } from './update-comunidade-hero-foto.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'role-admin',
  permissions: ['tenant:manage'],
};

function buildTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 't1',
    tenantId: 't1',
    nome: 'Loja Maçônica Verdadeira Luz nº 06',
    numero: '6',
    potencia: 'GLEG',
    dominio: null,
    subdominio: 'vl6',
    endereco: null,
    telefone: null,
    whatsapp: null,
    site: null,
    email: 'contato@vl6.org.br',
    modulosHabilitados: [],
    comunidadeHeroFotoUrl: null,
    comunidadeHeroFotoPosicao: null,
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
  const tenantRepository = new InMemoryTenantRepository();
  const useCase = new UpdateComunidadeHeroFotoUseCase({
    tenantRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, tenantRepository };
}

describe('UpdateComunidadeHeroFotoUseCase', () => {
  it('grava a foto e o enquadramento informados', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(buildTenant());

    const result = await useCase.execute(ctx, {
      fotoUrl: 'https://blob.vercel-storage.com/templo.jpg',
      posicao: 30,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.comunidadeHeroFotoUrl).toBe('https://blob.vercel-storage.com/templo.jpg');
    expect(result.value.comunidadeHeroFotoPosicao).toBe(30);
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('admin-1');

    const persisted = await tenantRepository.findById('t1');
    expect(persisted?.comunidadeHeroFotoUrl).toBe('https://blob.vercel-storage.com/templo.jpg');
  });

  it('remove a foto e zera o enquadramento quando fotoUrl é null', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(
      buildTenant({
        comunidadeHeroFotoUrl: 'https://exemplo.com/foto.jpg',
        comunidadeHeroFotoPosicao: 70,
      }),
    );

    const result = await useCase.execute(ctx, { fotoUrl: null, posicao: 70 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.comunidadeHeroFotoUrl).toBeNull();
    expect(result.value.comunidadeHeroFotoPosicao).toBeNull();
  });

  it('rejeita quem não tem permissão tenant:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, { fotoUrl: 'https://exemplo.com/foto.jpg', posicao: 50 }),
    ).rejects.toThrow('Permissão ausente: tenant:manage.');
  });

  it('retorna not_found quando a Loja não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      fotoUrl: 'https://exemplo.com/foto.jpg',
      posicao: 50,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
