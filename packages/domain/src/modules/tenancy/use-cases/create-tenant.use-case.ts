import {
  DEFAULT_ROLE_PERMISSIONS,
  DEFAULT_TENANT_BRANDING,
  SYSTEM_ROLE_KEYS,
  type CreateTenantInput,
} from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, err, ok, type Result } from '../../../shared/result';
import type { Role } from '../../identity-access/entities/role.entity';
import type { IRoleRepository } from '../../identity-access/repositories/role.repository';
import type { Tenant } from '../entities/tenant.entity';
import type { TenantBranding } from '../entities/tenant-branding.entity';
import type { TenantSettings } from '../entities/tenant-settings.entity';
import type { ITenantRepository } from '../repositories/tenant.repository';
import type { ITenantBrandingRepository } from '../repositories/tenant-branding.repository';
import type { ITenantSettingsRepository } from '../repositories/tenant-settings.repository';

export interface CreateTenantDeps {
  tenantRepository: ITenantRepository;
  brandingRepository: ITenantBrandingRepository;
  settingsRepository: ITenantSettingsRepository;
  roleRepository: IRoleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Provisiona uma nova Loja na plataforma: cria o `Tenant`, o `TenantBranding`
 * padrão (paleta seed — docs/architecture/09), as `TenantSettings` padrão e
 * o conjunto de 9 papéis de fábrica com a matriz RBAC de
 * docs/architecture/08-permissoes-rbac.md §8.2. Restrito a `tenant:create`,
 * concedido apenas ao papel `super_admin` (operação da plataforma).
 */
export class CreateTenantUseCase {
  constructor(private readonly deps: CreateTenantDeps) {}

  async execute(ctx: AuthContext, input: CreateTenantInput): Promise<Result<Tenant>> {
    requirePermission(ctx, 'tenant:create');

    const subdomainTaken = await this.deps.tenantRepository.existsBySubdomain(input.subdominio);
    if (subdomainTaken) {
      return err(new ConflictError(`Subdomínio "${input.subdominio}" já está em uso.`));
    }

    const now = this.deps.clock.now();
    const tenantId = this.deps.idGenerator.next();

    const tenant: Tenant = {
      id: tenantId,
      tenantId,
      nome: input.nome,
      numero: input.numero,
      potencia: input.potencia,
      dominio: input.dominio,
      subdominio: input.subdominio,
      endereco: input.endereco,
      telefone: input.telefone,
      whatsapp: input.whatsapp,
      site: input.site,
      email: input.email,
      modulosHabilitados: input.modulosHabilitados,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.tenantRepository.create(tenant);

    const branding: TenantBranding = {
      id: this.deps.idGenerator.next(),
      tenantId,
      ...DEFAULT_TENANT_BRANDING,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.brandingRepository.create(branding);

    const settings: TenantSettings = {
      id: this.deps.idGenerator.next(),
      tenantId,
      idiomaPadrao: 'pt-BR',
      textosInstitucionais: {},
      itensMenu: [],
      rodape: { textoDireitosAutorais: `© ${tenant.nome}`, links: [] },
      integracoesHabilitadas: [],
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.settingsRepository.create(settings);

    await Promise.all(
      SYSTEM_ROLE_KEYS.map((chave) => {
        const role: Role = {
          id: this.deps.idGenerator.next(),
          tenantId,
          nome: chave,
          chave,
          permissoes: DEFAULT_ROLE_PERMISSIONS[chave],
          sistemico: true,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        };
        return this.deps.roleRepository.create(role);
      }),
    );

    return ok(tenant);
  }
}
