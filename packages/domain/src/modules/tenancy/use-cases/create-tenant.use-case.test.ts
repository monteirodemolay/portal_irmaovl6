import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryRoleRepository,
  InMemoryTenantBrandingRepository,
  InMemoryTenantRepository,
  InMemoryTenantSettingsRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateTenantUseCase } from './create-tenant.use-case';

const superAdminCtx: AuthContext = {
  uid: 'platform-owner',
  tenantId: 'platform',
  roleId: 'role-super-admin',
  permissions: ['tenant:manage'],
};

const validInput = {
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
};

function buildUseCase() {
  const tenantRepository = new InMemoryTenantRepository();
  const brandingRepository = new InMemoryTenantBrandingRepository();
  const settingsRepository = new InMemoryTenantSettingsRepository();
  const roleRepository = new InMemoryRoleRepository();
  const useCase = new CreateTenantUseCase({
    tenantRepository,
    brandingRepository,
    settingsRepository,
    roleRepository,
    clock: new FixedClock(),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, tenantRepository, brandingRepository, settingsRepository, roleRepository };
}

describe('CreateTenantUseCase', () => {
  it('cria o tenant, o branding padrão, as settings padrão e os 8 papéis de fábrica', async () => {
    const { useCase, brandingRepository, settingsRepository, roleRepository } = buildUseCase();

    const result = await useCase.execute(superAdminCtx, validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.subdominio).toBe('vl6');

    const branding = await brandingRepository.findByTenantId(result.value.id);
    expect(branding?.corPrimaria).toBe('#061C36');

    const settings = await settingsRepository.findByTenantId(result.value.id);
    expect(settings?.idiomaPadrao).toBe('pt-BR');

    const roles = await roleRepository.listByTenant(result.value.id);
    expect(roles).toHaveLength(8);
    expect(roles.map((r) => r.chave)).toContain('admin');
    expect(roles.map((r) => r.chave)).not.toContain('super_admin');
  });

  it('rejeita subdomínio duplicado', async () => {
    const { useCase } = buildUseCase();
    await useCase.execute(superAdminCtx, validInput);

    const result = await useCase.execute(superAdminCtx, validInput);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('rejeita quem não é do tenant platform, mesmo com tenant:manage', async () => {
    const { useCase } = buildUseCase();
    // Administrador de Loja comum: tem tenant:manage (implica tenant:create
    // em hasPermission), mas não é o Administrador Geral — não pode criar
    // Lojas para outros tenants (ver requirePlatformAdmin).
    const ctxAdminDeLoja: AuthContext = {
      uid: 'admin-vl6',
      tenantId: 't1',
      roleId: 'role-admin',
      permissions: ['tenant:manage'],
    };

    await expect(useCase.execute(ctxAdminDeLoja, validInput)).rejects.toThrow(
      'Permissão ausente: platform:admin.',
    );
  });
});
