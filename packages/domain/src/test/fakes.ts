import type { IClock, IIdGenerator } from '../shared/ports';
import type { Tenant } from '../modules/tenancy/entities/tenant.entity';
import type { TenantBranding } from '../modules/tenancy/entities/tenant-branding.entity';
import type { TenantSettings } from '../modules/tenancy/entities/tenant-settings.entity';
import type { ITenantRepository } from '../modules/tenancy/repositories/tenant.repository';
import type { ITenantBrandingRepository } from '../modules/tenancy/repositories/tenant-branding.repository';
import type { ITenantSettingsRepository } from '../modules/tenancy/repositories/tenant-settings.repository';
import type { Role } from '../modules/identity-access/entities/role.entity';
import type { User } from '../modules/identity-access/entities/user.entity';
import type { IRoleRepository } from '../modules/identity-access/repositories/role.repository';
import type { IUserRepository } from '../modules/identity-access/repositories/user.repository';
import type { Member } from '../modules/membership/entities/member.entity';
import type { MemberPositionHistory } from '../modules/membership/entities/member-position-history.entity';
import type {
  IMemberRepository,
  MemberSearchFilters,
} from '../modules/membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../modules/membership/repositories/member-position-history.repository';
import type { PageRequest, PageResult } from '../shared/pagination';
import type { BoardTerm } from '../modules/governance/entities/board-term.entity';
import type { BoardPositionAssignment } from '../modules/governance/entities/board-position-assignment.entity';
import type { Committee } from '../modules/governance/entities/committee.entity';
import type { IBoardTermRepository } from '../modules/governance/repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../modules/governance/repositories/board-position-assignment.repository';
import type { ICommitteeRepository } from '../modules/governance/repositories/committee.repository';
import type { BoardPositionKey } from '@vl6/shared';
import type { News } from '../modules/content/entities/news.entity';
import type { Announcement } from '../modules/content/entities/announcement.entity';
import type { INewsRepository } from '../modules/content/repositories/news.repository';
import type { IAnnouncementRepository } from '../modules/content/repositories/announcement.repository';
import type { AuditLog } from '../modules/audit/entities/audit-log.entity';
import type {
  IAuditLogRepository,
  AuditLogFilters,
} from '../modules/audit/repositories/audit-log.repository';

export class FixedClock implements IClock {
  constructor(private readonly fixed: Date = new Date('2026-01-01T00:00:00Z')) {}
  now(): Date {
    return this.fixed;
  }
}

export class SequentialIdGenerator implements IIdGenerator {
  private counter = 0;
  next(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class InMemoryTenantRepository implements ITenantRepository {
  private readonly byId = new Map<string, Tenant>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByDomain(domain: string) {
    return [...this.byId.values()].find((t) => t.dominio === domain) ?? null;
  }
  async findBySubdomain(subdomain: string) {
    return [...this.byId.values()].find((t) => t.subdominio === subdomain) ?? null;
  }
  async existsBySubdomain(subdomain: string) {
    return [...this.byId.values()].some((t) => t.subdominio === subdomain);
  }
  async create(tenant: Tenant) {
    this.byId.set(tenant.id, tenant);
  }
  async update(tenant: Tenant) {
    this.byId.set(tenant.id, tenant);
  }
}

export class InMemoryTenantBrandingRepository implements ITenantBrandingRepository {
  private readonly byTenantId = new Map<string, TenantBranding>();
  async findByTenantId(tenantId: string) {
    return this.byTenantId.get(tenantId) ?? null;
  }
  async create(branding: TenantBranding) {
    this.byTenantId.set(branding.tenantId, branding);
  }
  async update(branding: TenantBranding) {
    this.byTenantId.set(branding.tenantId, branding);
  }
}

export class InMemoryTenantSettingsRepository implements ITenantSettingsRepository {
  private readonly byTenantId = new Map<string, TenantSettings>();
  async findByTenantId(tenantId: string) {
    return this.byTenantId.get(tenantId) ?? null;
  }
  async create(settings: TenantSettings) {
    this.byTenantId.set(settings.tenantId, settings);
  }
  async update(settings: TenantSettings) {
    this.byTenantId.set(settings.tenantId, settings);
  }
}

export class InMemoryRoleRepository implements IRoleRepository {
  private readonly byId = new Map<string, Role>();
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByKey(tenantId: string, chave: string) {
    return (
      [...this.byId.values()].find((r) => r.tenantId === tenantId && r.chave === chave) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((r) => r.tenantId === tenantId);
  }
  async create(role: Role) {
    this.byId.set(role.id, role);
  }
  async update(role: Role) {
    this.byId.set(role.id, role);
  }
}

export class InMemoryUserRepository implements IUserRepository {
  private readonly byId = new Map<string, User>();
  async findById(uid: string) {
    return this.byId.get(uid) ?? null;
  }
  async findByEmail(tenantId: string, email: string) {
    return (
      [...this.byId.values()].find((u) => u.tenantId === tenantId && u.email === email) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((u) => u.tenantId === tenantId);
  }
  async create(user: User) {
    this.byId.set(user.id, user);
  }
  async update(user: User) {
    this.byId.set(user.id, user);
  }
}

export class InMemoryMemberRepository implements IMemberRepository {
  private readonly byId = new Map<string, Member>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByUserId(tenantId: string, userId: string) {
    return (
      [...this.byId.values()].find((m) => m.tenantId === tenantId && m.userId === userId) ?? null
    );
  }
  async existsByMatricula(tenantId: string, matricula: string) {
    return [...this.byId.values()].some(
      (m) => m.tenantId === tenantId && m.matricula === matricula,
    );
  }
  async existsByCim(tenantId: string, cim: string) {
    return [...this.byId.values()].some((m) => m.tenantId === tenantId && m.cim === cim);
  }
  async search(filters: MemberSearchFilters, page: PageRequest): Promise<PageResult<Member>> {
    const items = [...this.byId.values()].filter((m) => m.tenantId === filters.tenantId);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async create(member: Member) {
    this.byId.set(member.id, member);
  }
  async update(member: Member) {
    this.byId.set(member.id, member);
  }
}

export class InMemoryMemberPositionHistoryRepository implements IMemberPositionHistoryRepository {
  private readonly byId = new Map<string, MemberPositionHistory>();

  async findActiveByMemberId(memberId: string) {
    return (
      [...this.byId.values()].find((h) => h.memberId === memberId && h.dataFim === null) ?? null
    );
  }
  async listByMemberId(memberId: string) {
    return [...this.byId.values()].filter((h) => h.memberId === memberId);
  }
  async create(entry: MemberPositionHistory) {
    this.byId.set(entry.id, entry);
  }
  async update(entry: MemberPositionHistory) {
    this.byId.set(entry.id, entry);
  }
}

export class InMemoryBoardTermRepository implements IBoardTermRepository {
  private readonly byId = new Map<string, BoardTerm>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findActive(tenantId: string, at: Date = new Date()) {
    return (
      [...this.byId.values()].find(
        (t) => t.tenantId === tenantId && t.periodoInicio <= at && at <= t.periodoFim,
      ) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((t) => t.tenantId === tenantId);
  }
  async overlaps(tenantId: string, periodoInicio: Date, periodoFim: Date, excludeId?: string) {
    return [...this.byId.values()].some(
      (t) =>
        t.tenantId === tenantId &&
        t.id !== excludeId &&
        periodoInicio <= t.periodoFim &&
        periodoFim >= t.periodoInicio,
    );
  }
  async create(term: BoardTerm) {
    this.byId.set(term.id, term);
  }
  async update(term: BoardTerm) {
    this.byId.set(term.id, term);
  }
}

export class InMemoryBoardPositionAssignmentRepository implements IBoardPositionAssignmentRepository {
  private readonly byId = new Map<string, BoardPositionAssignment>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByGestao(gestaoId: string) {
    return [...this.byId.values()].filter((a) => a.gestaoId === gestaoId);
  }
  async findByGestaoAndCargo(gestaoId: string, cargo: BoardPositionKey) {
    return (
      [...this.byId.values()].find((a) => a.gestaoId === gestaoId && a.cargo === cargo) ?? null
    );
  }
  async create(assignment: BoardPositionAssignment) {
    this.byId.set(assignment.id, assignment);
  }
  async update(assignment: BoardPositionAssignment) {
    this.byId.set(assignment.id, assignment);
  }
}

export class InMemoryCommitteeRepository implements ICommitteeRepository {
  private readonly byId = new Map<string, Committee>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByGestao(gestaoId: string) {
    return [...this.byId.values()].filter((c) => c.gestaoId === gestaoId);
  }
  async listByMemberId(tenantId: string, memberId: string) {
    return [...this.byId.values()].filter(
      (c) => c.tenantId === tenantId && c.membrosIds.includes(memberId),
    );
  }
  async create(committee: Committee) {
    this.byId.set(committee.id, committee);
  }
  async update(committee: Committee) {
    this.byId.set(committee.id, committee);
  }
}

export class InMemoryNewsRepository implements INewsRepository {
  private readonly byId = new Map<string, News>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async existsBySlug(tenantId: string, slug: string) {
    return [...this.byId.values()].some((n) => n.tenantId === tenantId && n.slug === slug);
  }
  async listPublished(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const items = [...this.byId.values()].filter((n) => n.tenantId === tenantId && n.publicado);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const items = [...this.byId.values()].filter((n) => n.tenantId === tenantId);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async create(news: News) {
    this.byId.set(news.id, news);
  }
  async update(news: News) {
    this.byId.set(news.id, news);
  }
}

export class InMemoryAnnouncementRepository implements IAnnouncementRepository {
  private readonly byId = new Map<string, Announcement>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listActive(tenantId: string, at: Date = new Date()) {
    return [...this.byId.values()].filter(
      (a) =>
        a.tenantId === tenantId &&
        a.publicado &&
        (a.dataExpiracao === null || a.dataExpiracao >= at),
    );
  }
  async listHighlighted(tenantId: string) {
    return [...this.byId.values()].filter((a) => a.tenantId === tenantId && a.destacar);
  }
  async listAll(tenantId: string) {
    return [...this.byId.values()].filter((a) => a.tenantId === tenantId);
  }
  async create(announcement: Announcement) {
    this.byId.set(announcement.id, announcement);
  }
  async update(announcement: Announcement) {
    this.byId.set(announcement.id, announcement);
  }
}

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private readonly entries: AuditLog[] = [];

  async append(entry: AuditLog) {
    this.entries.push(entry);
  }
  async search(filters: AuditLogFilters, page: PageRequest): Promise<PageResult<AuditLog>> {
    const items = this.entries.filter(
      (e) =>
        e.tenantId === filters.tenantId &&
        (!filters.entidade || e.entidade === filters.entidade) &&
        (!filters.entidadeId || e.entidadeId === filters.entidadeId),
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
}
