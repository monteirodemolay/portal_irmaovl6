import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryTenantRepository } from '../../../test/fakes';
import type { Tenant } from '../entities/tenant.entity';
import { UpdateHeroPhotoUseCase } from './update-hero-photo.use-case';

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
    heroPhotos: {},
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
  const useCase = new UpdateHeroPhotoUseCase({
    tenantRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
  });
  return { useCase, tenantRepository };
}

describe('UpdateHeroPhotoUseCase', () => {
  it('grava a foto e o enquadramento informados na página indicada', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(buildTenant());

    const result = await useCase.execute(ctx, {
      pageKey: 'dashboard',
      fotoUrl: 'https://blob.vercel-storage.com/templo.jpg',
      posicao: 30,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.heroPhotos.dashboard).toEqual({
      url: 'https://blob.vercel-storage.com/templo.jpg',
      posicao: 30,
    });
    expect(result.value.updatedAt).toEqual(new Date('2026-06-01T00:00:00Z'));
    expect(result.value.updatedBy).toBe('admin-1');

    const persisted = await tenantRepository.findById('t1');
    expect(persisted?.heroPhotos.dashboard?.url).toBe('https://blob.vercel-storage.com/templo.jpg');
  });

  it('não mexe na foto de outra página', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(
      buildTenant({
        heroPhotos: { comunidade: { url: 'https://exemplo.com/a.jpg', posicao: 50 } },
      }),
    );

    const result = await useCase.execute(ctx, {
      pageKey: 'dashboard',
      fotoUrl: 'https://exemplo.com/b.jpg',
      posicao: 20,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.heroPhotos.comunidade).toEqual({
      url: 'https://exemplo.com/a.jpg',
      posicao: 50,
    });
    expect(result.value.heroPhotos.dashboard).toEqual({
      url: 'https://exemplo.com/b.jpg',
      posicao: 20,
    });
  });

  it('remove a foto da página quando fotoUrl é null', async () => {
    const { useCase, tenantRepository } = buildUseCase();
    await tenantRepository.create(
      buildTenant({
        heroPhotos: { comunidade: { url: 'https://exemplo.com/foto.jpg', posicao: 70 } },
      }),
    );

    const result = await useCase.execute(ctx, {
      pageKey: 'comunidade',
      fotoUrl: null,
      posicao: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.heroPhotos.comunidade).toBeUndefined();
  });

  it('rejeita quem não tem permissão tenant:manage', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(ctxSemPermissao, {
        pageKey: 'comunidade',
        fotoUrl: 'https://exemplo.com/foto.jpg',
        posicao: 50,
      }),
    ).rejects.toThrow('Permissão ausente: tenant:manage.');
  });

  it('retorna not_found quando a Loja não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      pageKey: 'comunidade',
      fotoUrl: 'https://exemplo.com/foto.jpg',
      posicao: 50,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
