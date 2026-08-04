import {
  AssignRoleUseCase,
  AuthenticateUserUseCase,
  BootstrapTenantAdminUseCase,
  CreateTenantUseCase,
  ResolveTenantByHostUseCase,
  UpdateTenantBrandingUseCase,
} from '@vl6/domain';
import { getAdminFirestore } from './firebase/admin-app';
import { FirestoreRoleRepository } from './firestore/repositories/role.repository';
import { FirestoreTenantRepository } from './firestore/repositories/tenant.repository';
import { FirestoreTenantBrandingRepository } from './firestore/repositories/tenant-branding.repository';
import { FirestoreTenantSettingsRepository } from './firestore/repositories/tenant-settings.repository';
import { FirestoreUserRepository } from './firestore/repositories/user.repository';
import { SystemClock } from './adapters/system-clock';
import { FirestoreIdGenerator } from './adapters/firestore-id-generator';

/**
 * Composition root do servidor — instancia repositórios Firestore reais e os
 * injeta nos casos de uso do domínio. Único lugar da aplicação que conhece
 * simultaneamente `packages/domain` (interfaces) e `packages/infra`
 * (implementações); toda Server Action / Route Handler consome apenas isto,
 * nunca importa um repositório Firestore diretamente.
 */
export function createServerContainer() {
  const db = getAdminFirestore();

  const repositories = {
    tenant: new FirestoreTenantRepository(db),
    tenantBranding: new FirestoreTenantBrandingRepository(db),
    tenantSettings: new FirestoreTenantSettingsRepository(db),
    user: new FirestoreUserRepository(db),
    role: new FirestoreRoleRepository(db),
  };

  const clock = new SystemClock();
  const idGenerator = new FirestoreIdGenerator(db);

  const useCases = {
    createTenant: new CreateTenantUseCase({
      tenantRepository: repositories.tenant,
      brandingRepository: repositories.tenantBranding,
      settingsRepository: repositories.tenantSettings,
      roleRepository: repositories.role,
      clock,
      idGenerator,
    }),
    updateTenantBranding: new UpdateTenantBrandingUseCase({
      brandingRepository: repositories.tenantBranding,
      clock,
    }),
    resolveTenantByHost: new ResolveTenantByHostUseCase({ tenantRepository: repositories.tenant }),
    authenticateUser: new AuthenticateUserUseCase({ userRepository: repositories.user, clock }),
    assignRole: new AssignRoleUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
    }),
    bootstrapTenantAdmin: new BootstrapTenantAdminUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
    }),
  };

  return { db, repositories, useCases };
}

export type ServerContainer = ReturnType<typeof createServerContainer>;
