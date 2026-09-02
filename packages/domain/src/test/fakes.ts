import type { IClock, IIdGenerator } from '../shared/ports';
import type { Tenant } from '../modules/tenancy/entities/tenant.entity';
import type { TenantBranding } from '../modules/tenancy/entities/tenant-branding.entity';
import type { TenantSettings } from '../modules/tenancy/entities/tenant-settings.entity';
import type { ITenantRepository } from '../modules/tenancy/repositories/tenant.repository';
import type { ITenantBrandingRepository } from '../modules/tenancy/repositories/tenant-branding.repository';
import type { ITenantSettingsRepository } from '../modules/tenancy/repositories/tenant-settings.repository';
import type { TenantDomainVerification } from '../modules/tenancy/entities/tenant-domain-verification.entity';
import type { ITenantDomainVerificationRepository } from '../modules/tenancy/repositories/tenant-domain-verification.repository';
import type { Role } from '../modules/identity-access/entities/role.entity';
import type { User } from '../modules/identity-access/entities/user.entity';
import type { ApiKey } from '../modules/identity-access/entities/api-key.entity';
import type { IRoleRepository } from '../modules/identity-access/repositories/role.repository';
import type { IUserRepository } from '../modules/identity-access/repositories/user.repository';
import type { IApiKeyRepository } from '../modules/identity-access/repositories/api-key.repository';
import type {
  GeneratedApiKey,
  IApiKeyGenerator,
} from '../modules/identity-access/services/api-key-generator';
import type { Member } from '../modules/membership/entities/member.entity';
import type { MemberPositionHistory } from '../modules/membership/entities/member-position-history.entity';
import type { MemberSituationRecord } from '../modules/membership/entities/member-situation-record.entity';
import type {
  IMemberRepository,
  MemberSearchFilters,
} from '../modules/membership/repositories/member.repository';
import type { IMemberPositionHistoryRepository } from '../modules/membership/repositories/member-position-history.repository';
import type { IMemberSituationRecordRepository } from '../modules/membership/repositories/member-situation-record.repository';
import type { PageRequest, PageResult } from '../shared/pagination';
import type { BoardTerm } from '../modules/governance/entities/board-term.entity';
import type { BoardPositionAssignment } from '../modules/governance/entities/board-position-assignment.entity';
import type { Committee } from '../modules/governance/entities/committee.entity';
import type { IBoardTermRepository } from '../modules/governance/repositories/board-term.repository';
import type { IBoardPositionAssignmentRepository } from '../modules/governance/repositories/board-position-assignment.repository';
import type { ICommitteeRepository } from '../modules/governance/repositories/committee.repository';
import type { MemberCentralProfile } from '../modules/central/entities/member-central-profile.entity';
import type { PublicationSettings } from '../modules/central/entities/publication-settings.entity';
import type { PublicationConsent } from '../modules/central/entities/publication-consent.entity';
import type { IMemberCentralProfileRepository } from '../modules/central/repositories/member-central-profile.repository';
import type {
  IPublicationSettingsRepository,
  PublishedMemberRef,
} from '../modules/central/repositories/publication-settings.repository';
import type { IPublicationConsentRepository } from '../modules/central/repositories/publication-consent.repository';
import type { News } from '../modules/content/entities/news.entity';
import type { Announcement } from '../modules/content/entities/announcement.entity';
import type { NewsComment } from '../modules/content/entities/news-comment.entity';
import type { InspirationalQuote } from '../modules/content/entities/inspirational-quote.entity';
import type { INewsRepository } from '../modules/content/repositories/news.repository';
import type { IAnnouncementRepository } from '../modules/content/repositories/announcement.repository';
import type { INewsCommentRepository } from '../modules/content/repositories/news-comment.repository';
import type { IInspirationalQuoteRepository } from '../modules/content/repositories/inspirational-quote.repository';
import type { AuditLog } from '../modules/audit/entities/audit-log.entity';
import type {
  IAuditLogRepository,
  AuditLogFilters,
} from '../modules/audit/repositories/audit-log.repository';
import type { FileAsset } from '../modules/document-management/entities/file-asset.entity';
import type { IFileAssetRepository } from '../modules/document-management/repositories/file-asset.repository';
import type { LibraryItem } from '../modules/library/entities/library-item.entity';
import type { LibraryCategory } from '../modules/library/entities/library-category.entity';
import type { LibraryFavorite } from '../modules/library/entities/library-favorite.entity';
import type { ILibraryItemRepository } from '../modules/library/repositories/library-item.repository';
import type { ILibraryCategoryRepository } from '../modules/library/repositories/library-category.repository';
import type { ILibraryFavoriteRepository } from '../modules/library/repositories/library-favorite.repository';
import type { Link } from '../modules/notification/entities/link.entity';
import type { Notification } from '../modules/notification/entities/notification.entity';
import type { NotificationPreference } from '../modules/notification/entities/notification-preference.entity';
import type { ILinkRepository } from '../modules/notification/repositories/link.repository';
import type { INotificationRepository } from '../modules/notification/repositories/notification.repository';
import type { INotificationPreferenceRepository } from '../modules/notification/repositories/notification-preference.repository';
import type { Event } from '../modules/agenda/entities/event.entity';
import type { EventAttendance } from '../modules/agenda/entities/event-attendance.entity';
import type { PersonalEvent } from '../modules/agenda/entities/personal-event.entity';
import type { PersonalTask } from '../modules/agenda/entities/personal-task.entity';
import type { PersonalNote } from '../modules/agenda/entities/personal-note.entity';
import type { IEventRepository } from '../modules/agenda/repositories/event.repository';
import type { IEventAttendanceRepository } from '../modules/agenda/repositories/event-attendance.repository';
import type { IPersonalEventRepository } from '../modules/agenda/repositories/personal-event.repository';
import type { IPersonalTaskRepository } from '../modules/agenda/repositories/personal-task.repository';
import type { IPersonalNoteRepository } from '../modules/agenda/repositories/personal-note.repository';
import type { ArtTemplate } from '../modules/communication/entities/art-template.entity';
import type { Publication } from '../modules/communication/entities/publication.entity';
import type { IArtTemplateRepository } from '../modules/communication/repositories/art-template.repository';
import type { IPublicationRepository } from '../modules/communication/repositories/publication.repository';
import type { FileCategory } from '../modules/document-management/entities/file-category.entity';
import type { IFileCategoryRepository } from '../modules/document-management/repositories/file-category.repository';
import type { GalleryAlbum } from '../modules/gallery/entities/gallery-album.entity';
import type { GalleryMedia } from '../modules/gallery/entities/gallery-media.entity';
import type { IGalleryAlbumRepository } from '../modules/gallery/repositories/gallery-album.repository';
import type { IGalleryMediaRepository } from '../modules/gallery/repositories/gallery-media.repository';
import type { ArchiveCollection } from '../modules/archive/entities/archive-collection.entity';
import type { IArchiveCollectionRepository } from '../modules/archive/repositories/archive-collection.repository';
import type { ArchiveRelationNodeKind } from '@vl6/shared';
import type { ArchiveRelation } from '../modules/archive/entities/archive-relation.entity';
import type { IArchiveRelationRepository } from '../modules/archive/repositories/archive-relation.repository';
import type { ArchiveExhibition } from '../modules/archive/entities/archive-exhibition.entity';
import type { IArchiveExhibitionRepository } from '../modules/archive/repositories/archive-exhibition.repository';
import type { ArchiveCatalogEntry } from '../modules/archive/entities/archive-catalog-entry.entity';
import type { IArchiveCatalogEntryRepository } from '../modules/archive/repositories/archive-catalog-entry.repository';
import type { ArchiveContribution } from '../modules/archive/entities/archive-contribution.entity';
import type { IArchiveContributionRepository } from '../modules/archive/repositories/archive-contribution.repository';
import type { ArchiveItem } from '../modules/archive/entities/archive-item.entity';
import type { IArchiveItemRepository } from '../modules/archive/repositories/archive-item.repository';
import type { MediaAsset } from '../modules/archive/entities/media-asset.entity';
import type { IMediaAssetRepository } from '../modules/archive/repositories/media-asset.repository';
import type { ArchiveMedia } from '../modules/archive/entities/archive-media.entity';
import type { IArchiveMediaRepository } from '../modules/archive/repositories/archive-media.repository';
import type { GoogleCalendarConnection } from '../modules/integrations/entities/google-calendar-connection.entity';
import type {
  GoogleEventSyncLink,
  GoogleSyncSourceType,
} from '../modules/integrations/entities/google-event-sync-link.entity';
import type { GoogleCalendarEventCache } from '../modules/integrations/entities/google-calendar-event-cache.entity';
import type { IGoogleCalendarConnectionRepository } from '../modules/integrations/repositories/google-calendar-connection.repository';
import type { IGoogleEventSyncLinkRepository } from '../modules/integrations/repositories/google-event-sync-link.repository';
import type { IGoogleCalendarEventCacheRepository } from '../modules/integrations/repositories/google-calendar-event-cache.repository';
import type {
  GoogleCalendarEventInput,
  GoogleCalendarSyncResult,
  GoogleOAuthTokens,
  IGoogleCalendarService,
} from '../modules/integrations/services/google-calendar.service';
import type { ITokenCipher, IOAuthStateSigner, OAuthStatePayload } from '../shared/ports';
import type { FamilyPerson } from '../modules/family-legacy/entities/family-person.entity';
import type { FamilyRelationship } from '../modules/family-legacy/entities/family-relationship.entity';
import type { PersonFraternalRecord } from '../modules/family-legacy/entities/person-fraternal-record.entity';
import type { IFamilyPersonRepository } from '../modules/family-legacy/repositories/family-person.repository';
import type { IFamilyRelationshipRepository } from '../modules/family-legacy/repositories/family-relationship.repository';
import type { IPersonFraternalRecordRepository } from '../modules/family-legacy/repositories/person-fraternal-record.repository';

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
  async listAll() {
    return [...this.byId.values()];
  }
  async create(tenant: Tenant) {
    this.byId.set(tenant.id, tenant);
  }
  async update(tenant: Tenant) {
    this.byId.set(tenant.id, tenant);
  }
}

export class InMemoryTenantDomainVerificationRepository implements ITenantDomainVerificationRepository {
  private readonly byId = new Map<string, TenantDomainVerification>();

  async findByDomain(domain: string) {
    return this.byId.get(domain) ?? null;
  }
  async findByTenantId(tenantId: string) {
    return [...this.byId.values()].find((entry) => entry.tenantId === tenantId) ?? null;
  }
  async create(entry: TenantDomainVerification) {
    this.byId.set(entry.id, entry);
  }
  async update(entry: TenantDomainVerification) {
    this.byId.set(entry.id, entry);
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

export class InMemoryApiKeyRepository implements IApiKeyRepository {
  private readonly byId = new Map<string, ApiKey>();
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByHash(keyHash: string) {
    return [...this.byId.values()].find((k) => k.keyHash === keyHash) ?? null;
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((k) => k.tenantId === tenantId);
  }
  async create(apiKey: ApiKey) {
    this.byId.set(apiKey.id, apiKey);
  }
  async update(apiKey: ApiKey) {
    this.byId.set(apiKey.id, apiKey);
  }
}

export class FakeApiKeyGenerator implements IApiKeyGenerator {
  private counter = 0;
  generate(): GeneratedApiKey {
    this.counter += 1;
    const plainText = `vl6_test_${this.counter}`;
    return { plainText, prefix: plainText.slice(0, 12), hash: this.hash(plainText) };
  }
  hash(plainText: string): string {
    return `hash(${plainText})`;
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
  async delete(uid: string) {
    this.byId.delete(uid);
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
  async existsByCim(tenantId: string, cim: string) {
    return [...this.byId.values()].some((m) => m.tenantId === tenantId && m.cim === cim);
  }
  async findUnclaimedByTenant(tenantId: string) {
    return [...this.byId.values()]
      .filter((m) => m.tenantId === tenantId && m.userId === null && !m.deletedAt)
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto))
      .map((m) => ({ id: m.id, nomeCompleto: m.nomeCompleto }));
  }
  async search(filters: MemberSearchFilters, page: PageRequest): Promise<PageResult<Member>> {
    const items = [...this.byId.values()].filter((m) => m.tenantId === filters.tenantId);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async countByTenant(tenantId: string) {
    return [...this.byId.values()].filter((m) => m.tenantId === tenantId).length;
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

export class InMemoryMemberSituationRecordRepository implements IMemberSituationRecordRepository {
  private readonly byId = new Map<string, MemberSituationRecord>();

  async findVigenteByMemberId(memberId: string) {
    return [...this.byId.values()].find((r) => r.memberId === memberId && r.vigente) ?? null;
  }
  async listByMemberId(memberId: string) {
    return [...this.byId.values()].filter((r) => r.memberId === memberId);
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async create(record: MemberSituationRecord) {
    this.byId.set(record.id, record);
  }
  async update(record: MemberSituationRecord) {
    this.byId.set(record.id, record);
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
  async findByDate(tenantId: string, date: Date) {
    return this.findActive(tenantId, date);
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
  async findByGestaoAndCargo(gestaoId: string, cargo: string) {
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
  async findPublishedBySlug(tenantId: string, slug: string) {
    return (
      [...this.byId.values()].find(
        (n) => n.tenantId === tenantId && n.slug === slug && n.publicado,
      ) ?? null
    );
  }
  async existsBySlug(tenantId: string, slug: string) {
    return [...this.byId.values()].some((n) => n.tenantId === tenantId && n.slug === slug);
  }
  async listPublished(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const items = [...this.byId.values()].filter((n) => n.tenantId === tenantId && n.publicado);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const items = [...this.byId.values()].filter(
      (n) => n.tenantId === tenantId && n.deletedAt === null,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listConcluded(tenantId: string, page: PageRequest): Promise<PageResult<News>> {
    const items = [...this.byId.values()]
      .filter((n) => n.tenantId === tenantId && n.deletedAt !== null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async create(news: News) {
    this.byId.set(news.id, news);
  }
  async update(news: News) {
    this.byId.set(news.id, news);
  }
  async hardDelete(id: string) {
    this.byId.delete(id);
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
  async listAllActive(tenantId: string, at: Date = new Date()) {
    return [...this.byId.values()].filter(
      (a) =>
        a.tenantId === tenantId &&
        a.deletedAt === null &&
        (a.dataExpiracao === null || a.dataExpiracao >= at),
    );
  }
  async listConcluded(
    tenantId: string,
    page: PageRequest,
    at: Date = new Date(),
  ): Promise<PageResult<Announcement>> {
    const items = [...this.byId.values()]
      .filter(
        (a) =>
          a.tenantId === tenantId &&
          (a.deletedAt !== null || (a.dataExpiracao !== null && a.dataExpiracao < at)),
      )
      .sort((x, y) => y.updatedAt.getTime() - x.updatedAt.getTime());
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async countPublishedByTenant(tenantId: string) {
    return [...this.byId.values()].filter((a) => a.tenantId === tenantId && a.publicado).length;
  }
  async create(announcement: Announcement) {
    this.byId.set(announcement.id, announcement);
  }
  async update(announcement: Announcement) {
    this.byId.set(announcement.id, announcement);
  }
  async hardDelete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryInspirationalQuoteRepository implements IInspirationalQuoteRepository {
  private readonly byId = new Map<string, InspirationalQuote>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listAll(tenantId: string) {
    return [...this.byId.values()].filter((q) => q.tenantId === tenantId);
  }
  async listActive(tenantId: string) {
    return [...this.byId.values()].filter((q) => q.tenantId === tenantId && q.ativa);
  }
  async listConcluded(
    tenantId: string,
    page: PageRequest,
  ): Promise<PageResult<InspirationalQuote>> {
    const items = [...this.byId.values()]
      .filter((q) => q.tenantId === tenantId && (q.deletedAt !== null || !q.ativa))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async create(quote: InspirationalQuote) {
    this.byId.set(quote.id, quote);
  }
  async update(quote: InspirationalQuote) {
    this.byId.set(quote.id, quote);
  }
  async hardDelete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryNewsCommentRepository implements INewsCommentRepository {
  private readonly byId = new Map<string, NewsComment>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listApprovedByNews(newsId: string) {
    return [...this.byId.values()].filter(
      (c) => c.newsId === newsId && c.moderado && c.deletedAt === null,
    );
  }
  async listPendingByTenant(tenantId: string) {
    return [...this.byId.values()].filter(
      (c) => c.tenantId === tenantId && !c.moderado && c.deletedAt === null,
    );
  }
  async create(comment: NewsComment) {
    this.byId.set(comment.id, comment);
  }
  async update(comment: NewsComment) {
    this.byId.set(comment.id, comment);
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

export class InMemoryFileAssetRepository implements IFileAssetRepository {
  private readonly byId = new Map<string, FileAsset>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listPublishedByCategory(
    tenantId: string,
    categoriaId: string,
    page: PageRequest,
  ): Promise<PageResult<FileAsset>> {
    const items = [...this.byId.values()].filter(
      (f) => f.tenantId === tenantId && f.categoriaId === categoriaId && f.publicado,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<FileAsset>> {
    const items = [...this.byId.values()].filter((f) => f.tenantId === tenantId);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async countByTenant(tenantId: string) {
    return [...this.byId.values()].filter((f) => f.tenantId === tenantId).length;
  }
  async create(file: FileAsset) {
    this.byId.set(file.id, file);
  }
  async update(file: FileAsset) {
    this.byId.set(file.id, file);
  }
  async incrementDownloads(id: string) {
    const file = this.byId.get(id);
    if (file) this.byId.set(id, { ...file, contagemDownloads: file.contagemDownloads + 1 });
  }
  async incrementViews(id: string) {
    const file = this.byId.get(id);
    if (file) this.byId.set(id, { ...file, contagemVisualizacoes: file.contagemVisualizacoes + 1 });
  }
}

export class InMemoryFileCategoryRepository implements IFileCategoryRepository {
  private readonly byId = new Map<string, FileCategory>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((c) => c.tenantId === tenantId && c.deletedAt === null);
  }
  async create(category: FileCategory) {
    this.byId.set(category.id, category);
  }
  async update(category: FileCategory) {
    this.byId.set(category.id, category);
  }
}

export class InMemoryGalleryAlbumRepository implements IGalleryAlbumRepository {
  private readonly byId = new Map<string, GalleryAlbum>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByTenant(tenantId: string, categoria?: string) {
    return [...this.byId.values()].filter(
      (a) =>
        a.tenantId === tenantId &&
        a.deletedAt === null &&
        (categoria === undefined || a.categoria === categoria),
    );
  }
  async countByTenant(tenantId: string) {
    return [...this.byId.values()].filter((a) => a.tenantId === tenantId && a.deletedAt === null)
      .length;
  }
  async create(album: GalleryAlbum) {
    this.byId.set(album.id, album);
  }
  async update(album: GalleryAlbum) {
    this.byId.set(album.id, album);
  }
}

export class InMemoryArchiveCollectionRepository implements IArchiveCollectionRepository {
  private readonly byId = new Map<string, ArchiveCollection>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findBySlugAndTenant(tenantId: string, slug: string) {
    return (
      [...this.byId.values()].find(
        (c) => c.tenantId === tenantId && c.slug === slug && c.deletedAt === null,
      ) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((c) => c.tenantId === tenantId && c.deletedAt === null);
  }
  async listPublishedByTenant(tenantId: string) {
    return [...this.byId.values()].filter(
      (c) => c.tenantId === tenantId && c.deletedAt === null && c.publicado,
    );
  }
  async create(collection: ArchiveCollection) {
    this.byId.set(collection.id, collection);
  }
  async update(collection: ArchiveCollection) {
    this.byId.set(collection.id, collection);
  }
}

export class InMemoryArchiveRelationRepository implements IArchiveRelationRepository {
  private readonly byId = new Map<string, ArchiveRelation>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((r) => r.tenantId === tenantId && r.deletedAt === null);
  }
  async listByNode(tenantId: string, nodeTipo: ArchiveRelationNodeKind, nodeId: string) {
    return [...this.byId.values()].filter(
      (r) =>
        r.tenantId === tenantId &&
        r.deletedAt === null &&
        ((r.origemTipo === nodeTipo && r.origemId === nodeId) ||
          (r.destinoTipo === nodeTipo && r.destinoId === nodeId)),
    );
  }
  async create(relation: ArchiveRelation) {
    this.byId.set(relation.id, relation);
  }
  async update(relation: ArchiveRelation) {
    this.byId.set(relation.id, relation);
  }
}

export class InMemoryArchiveExhibitionRepository implements IArchiveExhibitionRepository {
  private readonly byId = new Map<string, ArchiveExhibition>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findBySlugAndTenant(tenantId: string, slug: string) {
    return (
      [...this.byId.values()].find(
        (e) => e.tenantId === tenantId && e.slug === slug && e.deletedAt === null,
      ) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.deletedAt === null);
  }
  async listPublishedByTenant(tenantId: string) {
    return [...this.byId.values()].filter(
      (e) => e.tenantId === tenantId && e.deletedAt === null && e.publicado,
    );
  }
  async create(exhibition: ArchiveExhibition) {
    this.byId.set(exhibition.id, exhibition);
  }
  async update(exhibition: ArchiveExhibition) {
    this.byId.set(exhibition.id, exhibition);
  }
}

export class InMemoryArchiveCatalogEntryRepository implements IArchiveCatalogEntryRepository {
  private readonly byId = new Map<string, ArchiveCatalogEntry>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByOrigemId(tenantId: string, origemId: string) {
    return (
      [...this.byId.values()].find(
        (e) => e.tenantId === tenantId && e.origemId === origemId && e.deletedAt === null,
      ) ?? null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.deletedAt === null);
  }
  async create(entry: ArchiveCatalogEntry) {
    this.byId.set(entry.id, entry);
  }
  async update(entry: ArchiveCatalogEntry) {
    this.byId.set(entry.id, entry);
  }
}

export class InMemoryArchiveContributionRepository implements IArchiveContributionRepository {
  private readonly byId = new Map<string, ArchiveContribution>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((c) => c.tenantId === tenantId && c.deletedAt === null);
  }
  async listByMember(tenantId: string, memberId: string) {
    return [...this.byId.values()].filter(
      (c) => c.tenantId === tenantId && c.memberId === memberId && c.deletedAt === null,
    );
  }
  async create(contribution: ArchiveContribution) {
    this.byId.set(contribution.id, contribution);
  }
  async update(contribution: ArchiveContribution) {
    this.byId.set(contribution.id, contribution);
  }
}

export class InMemoryArchiveItemRepository implements IArchiveItemRepository {
  private readonly byId = new Map<string, ArchiveItem>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>> {
    const items = [...this.byId.values()].filter(
      (i) => i.tenantId === tenantId && i.deletedAt === null,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async findByEventId(eventId: string) {
    return [...this.byId.values()].filter((i) => i.eventId === eventId && i.deletedAt === null);
  }
  async findByOrigemIniciacaoMemberId(tenantId: string, memberId: string) {
    return (
      [...this.byId.values()].find(
        (i) => i.tenantId === tenantId && i.origemIniciacaoMemberId === memberId,
      ) ?? null
    );
  }
  async findByOrigemElevacaoMemberId(tenantId: string, memberId: string) {
    return (
      [...this.byId.values()].find(
        (i) => i.tenantId === tenantId && i.origemElevacaoMemberId === memberId,
      ) ?? null
    );
  }
  async findByOrigemExaltacaoMemberId(tenantId: string, memberId: string) {
    return (
      [...this.byId.values()].find(
        (i) => i.tenantId === tenantId && i.origemExaltacaoMemberId === memberId,
      ) ?? null
    );
  }
  async findDeletedByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveItem>> {
    const items = [...this.byId.values()].filter(
      (i) => i.tenantId === tenantId && i.deletedAt !== null,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async findScheduledForPublication(tenantId: string, now: Date) {
    return [...this.byId.values()].filter(
      (i) =>
        i.tenantId === tenantId &&
        i.deletedAt === null &&
        i.publicacaoStatus === 'pronto_para_publicar' &&
        i.publicarEm != null &&
        i.publicarEm.getTime() <= now.getTime(),
    );
  }
  async countByTenant(tenantId: string) {
    return [...this.byId.values()].filter((i) => i.tenantId === tenantId && i.deletedAt === null)
      .length;
  }
  async countPublishedByTenant(tenantId: string) {
    return [...this.byId.values()].filter(
      (i) => i.tenantId === tenantId && i.deletedAt === null && i.publicacaoStatus === 'publicado',
    ).length;
  }
  async create(item: ArchiveItem) {
    this.byId.set(item.id, item);
  }
  async update(item: ArchiveItem) {
    this.byId.set(item.id, item);
  }
  async softDelete(id: string, deletedAt: Date, updatedBy: string) {
    const item = this.byId.get(id);
    if (item) {
      this.byId.set(id, {
        ...item,
        deletedAt,
        status: 'archived',
        ativo: false,
        updatedAt: deletedAt,
        updatedBy,
      });
    }
  }
  async restore(id: string, updatedBy: string) {
    const item = this.byId.get(id);
    if (item) {
      this.byId.set(id, { ...item, deletedAt: null, status: 'active', ativo: true, updatedBy });
    }
  }
  async incrementViews(id: string) {
    const item = this.byId.get(id);
    if (item) {
      this.byId.set(id, { ...item, contagemVisualizacoes: (item.contagemVisualizacoes ?? 0) + 1 });
    }
  }
}

export class InMemoryMediaAssetRepository implements IMediaAssetRepository {
  private readonly byId = new Map<string, MediaAsset>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<MediaAsset>> {
    const items = [...this.byId.values()].filter(
      (m) => m.tenantId === tenantId && m.deletedAt === null,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async findBySha256(tenantId: string, sha256: string) {
    return (
      [...this.byId.values()].find(
        (m) => m.tenantId === tenantId && m.sha256 === sha256 && m.deletedAt === null,
      ) ?? null
    );
  }
  async create(mediaAsset: MediaAsset) {
    this.byId.set(mediaAsset.id, mediaAsset);
  }
  async update(mediaAsset: MediaAsset) {
    this.byId.set(mediaAsset.id, mediaAsset);
  }
  async softDelete(id: string, deletedAt: Date, updatedBy: string) {
    const mediaAsset = this.byId.get(id);
    if (mediaAsset) {
      this.byId.set(id, {
        ...mediaAsset,
        deletedAt,
        status: 'archived',
        ativo: false,
        updatedAt: deletedAt,
        updatedBy,
      });
    }
  }
  async restore(id: string, updatedBy: string) {
    const mediaAsset = this.byId.get(id);
    if (mediaAsset) {
      this.byId.set(id, {
        ...mediaAsset,
        deletedAt: null,
        status: 'active',
        ativo: true,
        updatedBy,
      });
    }
  }
}

export class InMemoryArchiveMediaRepository implements IArchiveMediaRepository {
  private readonly byId = new Map<string, ArchiveMedia>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByTenant(tenantId: string, page: PageRequest): Promise<PageResult<ArchiveMedia>> {
    const items = [...this.byId.values()].filter(
      (m) => m.tenantId === tenantId && m.deletedAt === null,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async findByArchiveItemId(archiveItemId: string) {
    return [...this.byId.values()]
      .filter((m) => m.archiveItemId === archiveItemId && m.deletedAt === null)
      .sort((a, b) => a.order - b.order);
  }
  async findDeletedByTenant(
    tenantId: string,
    page: PageRequest,
  ): Promise<PageResult<ArchiveMedia>> {
    const items = [...this.byId.values()].filter(
      (m) => m.tenantId === tenantId && m.deletedAt !== null,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async findByPessoaIdentificada(tenantId: string, memberId: string) {
    return [...this.byId.values()]
      .filter(
        (m) =>
          m.tenantId === tenantId &&
          m.deletedAt === null &&
          (m.pessoasIdentificadas ?? []).includes(memberId),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async countPublishedByTenant(tenantId: string) {
    return [...this.byId.values()].filter(
      (m) => m.tenantId === tenantId && m.deletedAt === null && m.publicacaoStatus === 'publicado',
    ).length;
  }
  async create(archiveMedia: ArchiveMedia) {
    this.byId.set(archiveMedia.id, archiveMedia);
  }
  async update(archiveMedia: ArchiveMedia) {
    this.byId.set(archiveMedia.id, archiveMedia);
  }
  async softDelete(id: string, deletedAt: Date, updatedBy: string) {
    const archiveMedia = this.byId.get(id);
    if (archiveMedia) {
      this.byId.set(id, {
        ...archiveMedia,
        deletedAt,
        status: 'archived',
        ativo: false,
        updatedAt: deletedAt,
        updatedBy,
      });
    }
  }
  async restore(id: string, updatedBy: string) {
    const archiveMedia = this.byId.get(id);
    if (archiveMedia) {
      this.byId.set(id, {
        ...archiveMedia,
        deletedAt: null,
        status: 'active',
        ativo: true,
        updatedBy,
      });
    }
  }
  async incrementViews(id: string) {
    const archiveMedia = this.byId.get(id);
    if (archiveMedia) {
      this.byId.set(id, {
        ...archiveMedia,
        contagemVisualizacoes: (archiveMedia.contagemVisualizacoes ?? 0) + 1,
      });
    }
  }
}

export class InMemoryGalleryMediaRepository implements IGalleryMediaRepository {
  private readonly byId = new Map<string, GalleryMedia>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByAlbum(albumId: string) {
    return [...this.byId.values()].filter((m) => m.albumId === albumId && m.deletedAt === null);
  }
  async create(media: GalleryMedia) {
    this.byId.set(media.id, media);
  }
  async update(media: GalleryMedia) {
    this.byId.set(media.id, media);
  }
}

export class InMemoryLibraryItemRepository implements ILibraryItemRepository {
  private readonly byId = new Map<string, LibraryItem>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByCategory(tenantId: string, categoriaId: string) {
    return [...this.byId.values()].filter(
      (i) => i.tenantId === tenantId && i.categoriaId === categoriaId,
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((i) => i.tenantId === tenantId);
  }
  async countByTenant(tenantId: string) {
    return [...this.byId.values()].filter((i) => i.tenantId === tenantId).length;
  }
  async create(item: LibraryItem) {
    this.byId.set(item.id, item);
  }
  async update(item: LibraryItem) {
    this.byId.set(item.id, item);
  }
  async incrementDownloads(id: string) {
    const item = this.byId.get(id);
    if (item) this.byId.set(id, { ...item, contagemDownloads: item.contagemDownloads + 1 });
  }
  async incrementViews(id: string) {
    const item = this.byId.get(id);
    if (item) this.byId.set(id, { ...item, contagemVisualizacoes: item.contagemVisualizacoes + 1 });
  }
}

export class InMemoryLibraryCategoryRepository implements ILibraryCategoryRepository {
  private readonly byId = new Map<string, LibraryCategory>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((c) => c.tenantId === tenantId);
  }
  async create(category: LibraryCategory) {
    this.byId.set(category.id, category);
  }
  async update(category: LibraryCategory) {
    this.byId.set(category.id, category);
  }
}

export class InMemoryLibraryFavoriteRepository implements ILibraryFavoriteRepository {
  private readonly byId = new Map<string, LibraryFavorite>();

  async findByUserAndItem(userId: string, libraryItemId: string) {
    return (
      [...this.byId.values()].find(
        (f) => f.userId === userId && f.libraryItemId === libraryItemId,
      ) ?? null
    );
  }
  async listByUser(tenantId: string, userId: string) {
    return [...this.byId.values()].filter((f) => f.tenantId === tenantId && f.userId === userId);
  }
  async create(favorite: LibraryFavorite) {
    this.byId.set(favorite.id, favorite);
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryLinkRepository implements ILinkRepository {
  private readonly byId = new Map<string, Link>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listActive(tenantId: string) {
    return [...this.byId.values()].filter((l) => l.tenantId === tenantId && l.ativo);
  }
  async listAll(tenantId: string) {
    return [...this.byId.values()].filter((l) => l.tenantId === tenantId);
  }
  async create(link: Link) {
    this.byId.set(link.id, link);
  }
  async update(link: Link) {
    this.byId.set(link.id, link);
  }
}

export class InMemoryNotificationRepository implements INotificationRepository {
  private readonly byId = new Map<string, Notification>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByRecipient(
    tenantId: string,
    destinatarioId: string,
    page: PageRequest,
  ): Promise<PageResult<Notification>> {
    const items = [...this.byId.values()].filter(
      (n) => n.tenantId === tenantId && n.destinatarioId === destinatarioId,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async countUnreadByRecipient(tenantId: string, destinatarioId: string) {
    return [...this.byId.values()].filter(
      (n) => n.tenantId === tenantId && n.destinatarioId === destinatarioId && !n.lida,
    ).length;
  }
  async findByDedupeKey(tenantId: string, dedupeKey: string) {
    return (
      [...this.byId.values()].find((n) => n.tenantId === tenantId && n.dedupeKey === dedupeKey) ??
      null
    );
  }
  async listByDedupeKeyPrefix(tenantId: string, prefix: string) {
    return [...this.byId.values()].filter(
      (n) => n.tenantId === tenantId && n.dedupeKey?.startsWith(prefix),
    );
  }
  async listExpiringUnarchived(tenantId: string, at: Date) {
    return [...this.byId.values()].filter(
      (n) =>
        n.tenantId === tenantId &&
        n.archivedAt === null &&
        n.deletedAt === null &&
        n.expiresAt !== null &&
        n.expiresAt.getTime() <= at.getTime(),
    );
  }
  async create(notification: Notification) {
    this.byId.set(notification.id, notification);
  }
  async update(notification: Notification) {
    this.byId.set(notification.id, notification);
  }
}

export class InMemoryNotificationPreferenceRepository implements INotificationPreferenceRepository {
  private readonly byId = new Map<string, NotificationPreference>();

  async findByUserId(tenantId: string, userId: string) {
    return (
      [...this.byId.values()].find((p) => p.tenantId === tenantId && p.userId === userId) ?? null
    );
  }
  async create(preference: NotificationPreference) {
    this.byId.set(preference.id, preference);
  }
  async update(preference: NotificationPreference) {
    this.byId.set(preference.id, preference);
  }
}

export class InMemoryEventRepository implements IEventRepository {
  private readonly byId = new Map<string, Event>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listUpcoming(tenantId: string, from: Date, page: PageRequest): Promise<PageResult<Event>> {
    const items = [...this.byId.values()].filter(
      (e) => e.tenantId === tenantId && e.dataInicio >= from,
    );
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listAll(tenantId: string, page: PageRequest): Promise<PageResult<Event>> {
    const items = [...this.byId.values()].filter((e) => e.tenantId === tenantId);
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listConcluded(
    tenantId: string,
    page: PageRequest,
    at: Date = new Date(),
  ): Promise<PageResult<Event>> {
    const items = [...this.byId.values()]
      .filter(
        (e) =>
          e.tenantId === tenantId && (e.deletedAt !== null || (e.dataFim ?? e.dataInicio) < at),
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return { items: items.slice(0, page.limit), nextCursor: null, hasMore: false };
  }
  async listInRange(tenantId: string, from: Date, to: Date) {
    return [...this.byId.values()].filter(
      (e) => e.tenantId === tenantId && e.dataInicio >= from && e.dataInicio <= to,
    );
  }
  async countUpcomingByTenant(tenantId: string, from: Date) {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.dataInicio >= from)
      .length;
  }
  async create(event: Event) {
    this.byId.set(event.id, event);
  }
  async update(event: Event) {
    this.byId.set(event.id, event);
  }
  async hardDelete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryPersonalEventRepository implements IPersonalEventRepository {
  private readonly byId = new Map<string, PersonalEvent>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByUserInRange(tenantId: string, userId: string, from: Date, to: Date) {
    return [...this.byId.values()].filter(
      (e) =>
        e.tenantId === tenantId &&
        e.userId === userId &&
        e.deletedAt === null &&
        e.dataInicio >= from &&
        e.dataInicio <= to,
    );
  }
  async create(event: PersonalEvent) {
    this.byId.set(event.id, event);
  }
  async update(event: PersonalEvent) {
    this.byId.set(event.id, event);
  }
}

export class InMemoryPersonalTaskRepository implements IPersonalTaskRepository {
  private readonly byId = new Map<string, PersonalTask>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByUser(tenantId: string, userId: string) {
    return [...this.byId.values()].filter(
      (t) => t.tenantId === tenantId && t.userId === userId && t.deletedAt === null,
    );
  }
  async create(task: PersonalTask) {
    this.byId.set(task.id, task);
  }
  async update(task: PersonalTask) {
    this.byId.set(task.id, task);
  }
}

export class InMemoryPersonalNoteRepository implements IPersonalNoteRepository {
  private readonly byId = new Map<string, PersonalNote>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByUser(tenantId: string, userId: string) {
    return [...this.byId.values()].filter(
      (n) => n.tenantId === tenantId && n.userId === userId && n.deletedAt === null,
    );
  }
  async findByEvent(tenantId: string, userId: string, eventoOrigem: string, eventoId: string) {
    return (
      [...this.byId.values()].find(
        (n) =>
          n.tenantId === tenantId &&
          n.userId === userId &&
          n.deletedAt === null &&
          n.eventoOrigem === eventoOrigem &&
          n.eventoId === eventoId,
      ) ?? null
    );
  }
  async create(note: PersonalNote) {
    this.byId.set(note.id, note);
  }
  async update(note: PersonalNote) {
    this.byId.set(note.id, note);
  }
}

export class InMemoryEventAttendanceRepository implements IEventAttendanceRepository {
  private readonly byId = new Map<string, EventAttendance>();

  async findByEventAndMember(eventId: string, memberId: string) {
    return (
      [...this.byId.values()].find((a) => a.eventId === eventId && a.memberId === memberId) ?? null
    );
  }
  async listByEvent(eventId: string) {
    return [...this.byId.values()].filter((a) => a.eventId === eventId);
  }
  async countConfirmedByEvent(eventId: string) {
    return [...this.byId.values()].filter(
      (a) => a.eventId === eventId && a.statusPresenca === 'confirmado',
    ).length;
  }
  async create(attendance: EventAttendance) {
    this.byId.set(attendance.id, attendance);
  }
  async update(attendance: EventAttendance) {
    this.byId.set(attendance.id, attendance);
  }
}

export class InMemoryMemberCentralProfileRepository implements IMemberCentralProfileRepository {
  private readonly byId = new Map<string, MemberCentralProfile>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByMemberId(tenantId: string, memberId: string) {
    return (
      [...this.byId.values()].find((p) => p.tenantId === tenantId && p.memberId === memberId) ??
      null
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((p) => p.tenantId === tenantId);
  }
  async create(profile: MemberCentralProfile) {
    this.byId.set(profile.id, profile);
  }
  async update(profile: MemberCentralProfile) {
    this.byId.set(profile.id, profile);
  }
}

export class InMemoryPublicationSettingsRepository implements IPublicationSettingsRepository {
  private readonly byId = new Map<string, PublicationSettings>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByMemberId(tenantId: string, memberId: string) {
    return (
      [...this.byId.values()].find((s) => s.tenantId === tenantId && s.memberId === memberId) ??
      null
    );
  }
  async listPublishedByTenant(tenantId: string): Promise<PublishedMemberRef[]> {
    return [...this.byId.values()]
      .filter((s) => s.tenantId === tenantId && s.profilePublished && s.suspendedAt === null)
      .map((s) => ({ memberId: s.memberId }));
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((s) => s.tenantId === tenantId);
  }
  async create(settings: PublicationSettings) {
    this.byId.set(settings.id, settings);
  }
  async update(settings: PublicationSettings) {
    this.byId.set(settings.id, settings);
  }
}

export class InMemoryPublicationConsentRepository implements IPublicationConsentRepository {
  private readonly entries: PublicationConsent[] = [];

  async listByMemberId(tenantId: string, memberId: string) {
    return this.entries
      .filter((c) => c.tenantId === tenantId && c.memberId === memberId)
      .sort((a, b) => b.acceptedAt.getTime() - a.acceptedAt.getTime());
  }
  async append(consent: PublicationConsent) {
    this.entries.push(consent);
  }
}

export class InMemoryGoogleCalendarConnectionRepository implements IGoogleCalendarConnectionRepository {
  private readonly byId = new Map<string, GoogleCalendarConnection>();

  async findByUserId(tenantId: string, userId: string) {
    return (
      [...this.byId.values()].find((c) => c.tenantId === tenantId && c.userId === userId) ?? null
    );
  }
  async listActiveWithVl6Sync(tenantId: string) {
    return [...this.byId.values()].filter(
      (c) =>
        c.tenantId === tenantId && c.preferences.sincronizarVL6ParaGoogle && c.deletedAt === null,
    );
  }
  async create(connection: GoogleCalendarConnection) {
    this.byId.set(connection.id, connection);
  }
  async update(connection: GoogleCalendarConnection) {
    this.byId.set(connection.id, connection);
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryGoogleEventSyncLinkRepository implements IGoogleEventSyncLinkRepository {
  private readonly byId = new Map<string, GoogleEventSyncLink>();

  async findBySource(
    tenantId: string,
    userId: string,
    sourceType: GoogleSyncSourceType,
    sourceId: string,
  ) {
    return (
      [...this.byId.values()].find(
        (l) =>
          l.tenantId === tenantId &&
          l.userId === userId &&
          l.sourceType === sourceType &&
          l.sourceId === sourceId,
      ) ?? null
    );
  }
  async create(link: GoogleEventSyncLink) {
    this.byId.set(link.id, link);
  }
  async delete(id: string) {
    this.byId.delete(id);
  }
}

export class InMemoryGoogleCalendarEventCacheRepository implements IGoogleCalendarEventCacheRepository {
  private readonly byId = new Map<string, GoogleCalendarEventCache>();

  async listByUser(tenantId: string, userId: string) {
    return [...this.byId.values()].filter((e) => e.tenantId === tenantId && e.userId === userId);
  }
  async upsert(event: GoogleCalendarEventCache) {
    this.byId.set(event.id, event);
  }
  async deleteByGoogleEventId(tenantId: string, userId: string, googleEventId: string) {
    const entry = [...this.byId.values()].find(
      (e) => e.tenantId === tenantId && e.userId === userId && e.googleEventId === googleEventId,
    );
    if (entry) this.byId.delete(entry.id);
  }
}

/** Cifra "de mentira" (apenas prefixa/remove) — determinística e reversível para testes. */
export class FakeTokenCipher implements ITokenCipher {
  encrypt(plainText: string): string {
    return `enc(${plainText})`;
  }
  decrypt(cipherText: string): string {
    return cipherText.replace(/^enc\(/, '').replace(/\)$/, '');
  }
}

/** Assinatura "de mentira" — serializa o payload em JSON, sem HMAC real (suficiente para testar orquestração). */
export class FakeOAuthStateSigner implements IOAuthStateSigner {
  sign(payload: OAuthStatePayload): string {
    return JSON.stringify(payload);
  }
  verify(token: string): OAuthStatePayload | null {
    try {
      return JSON.parse(token) as OAuthStatePayload;
    } catch {
      return null;
    }
  }
}

export class FakeGoogleCalendarService implements IGoogleCalendarService {
  public createdEvents: GoogleCalendarEventInput[] = [];
  public updatedEvents: Array<{ googleEventId: string; input: GoogleCalendarEventInput }> = [];
  public deletedEventIds: string[] = [];
  public revokedTokens: string[] = [];
  private counter = 0;
  public nextSyncResult: GoogleCalendarSyncResult = {
    changes: [],
    nextSyncToken: null,
    isFullSync: false,
    fullSyncFrom: null,
  };
  public lastLoadEventsSyncToken: string | null | undefined;
  public tokensToReturn: GoogleOAuthTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresAt: new Date('2026-01-01T01:00:00Z'),
    scope: 'https://www.googleapis.com/auth/calendar.events',
  };

  buildAuthorizationUrl(state: string): string {
    return `https://accounts.google.com/o/oauth2/v2/auth?state=${state}`;
  }
  async exchangeCodeForTokens(): Promise<GoogleOAuthTokens> {
    return this.tokensToReturn;
  }
  async refreshAccessToken(): Promise<GoogleOAuthTokens> {
    return this.tokensToReturn;
  }
  async loadEvents(
    _accessToken: string,
    _calendarId: string,
    syncToken: string | null,
  ): Promise<GoogleCalendarSyncResult> {
    this.lastLoadEventsSyncToken = syncToken;
    return this.nextSyncResult;
  }
  async createEvent(
    _accessToken: string,
    _calendarId: string,
    event: GoogleCalendarEventInput,
  ): Promise<string> {
    this.createdEvents.push(event);
    this.counter += 1;
    return `google-event-${this.counter}`;
  }
  async updateEvent(
    _accessToken: string,
    _calendarId: string,
    googleEventId: string,
    event: GoogleCalendarEventInput,
  ): Promise<void> {
    this.updatedEvents.push({ googleEventId, input: event });
  }
  async deleteEvent(
    _accessToken: string,
    _calendarId: string,
    googleEventId: string,
  ): Promise<void> {
    this.deletedEventIds.push(googleEventId);
  }
  async revokeToken(token: string): Promise<void> {
    this.revokedTokens.push(token);
  }
}

export class InMemoryArtTemplateRepository implements IArtTemplateRepository {
  private readonly byId = new Map<string, ArtTemplate>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listAll(tenantId: string) {
    return [...this.byId.values()].filter((t) => t.tenantId === tenantId);
  }
  async listActiveByType(tenantId: string, type: ArtTemplate['type']) {
    return [...this.byId.values()].filter(
      (t) => t.tenantId === tenantId && t.type === type && t.active,
    );
  }
  async create(template: ArtTemplate) {
    this.byId.set(template.id, template);
  }
  async update(template: ArtTemplate) {
    this.byId.set(template.id, template);
  }
}

export class InMemoryPublicationRepository implements IPublicationRepository {
  private readonly byId = new Map<string, Publication>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByStatus(tenantId: string, statuses: Publication['publicacaoStatus'][] | null) {
    return [...this.byId.values()].filter(
      (p) =>
        p.tenantId === tenantId &&
        p.deletedAt === null &&
        (statuses === null || statuses.includes(p.publicacaoStatus)),
    );
  }
  async findBySource(
    tenantId: string,
    sourceType: Publication['sourceType'],
    sourceId: string,
    scheduledForDay: string,
  ) {
    return (
      [...this.byId.values()].find(
        (p) =>
          p.tenantId === tenantId &&
          p.sourceType === sourceType &&
          p.sourceId === sourceId &&
          p.scheduledFor !== null &&
          p.scheduledFor.toISOString().slice(0, 10) === scheduledForDay,
      ) ?? null
    );
  }
  async create(publication: Publication) {
    this.byId.set(publication.id, publication);
  }
  async update(publication: Publication) {
    this.byId.set(publication.id, publication);
  }
}

export class InMemoryFamilyPersonRepository implements IFamilyPersonRepository {
  private readonly byId = new Map<string, FamilyPerson>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async findByLinkedMemberId(tenantId: string, memberId: string) {
    return (
      [...this.byId.values()].find(
        (p) => p.tenantId === tenantId && p.linkedMemberId === memberId && !p.deletedAt,
      ) ?? null
    );
  }
  async searchByNormalizedName(tenantId: string, nomeBusca: string, limit: number) {
    return [...this.byId.values()]
      .filter((p) => p.tenantId === tenantId && !p.deletedAt && p.nomeBusca.includes(nomeBusca))
      .slice(0, limit);
  }
  async listManagedByMember(tenantId: string, memberId: string) {
    return [...this.byId.values()].filter(
      (p) => p.tenantId === tenantId && p.managedByMemberId === memberId && !p.deletedAt,
    );
  }
  async listByIds(tenantId: string, ids: string[]) {
    const idSet = new Set(ids);
    return [...this.byId.values()].filter((p) => p.tenantId === tenantId && idSet.has(p.id));
  }
  async create(entity: FamilyPerson) {
    this.byId.set(entity.id, entity);
  }
  async update(entity: FamilyPerson) {
    this.byId.set(entity.id, entity);
  }
}

export class InMemoryFamilyRelationshipRepository implements IFamilyRelationshipRepository {
  private readonly byId = new Map<string, FamilyRelationship>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByEndpoint(tenantId: string, kind: string, id: string) {
    return [...this.byId.values()].filter(
      (r) =>
        r.tenantId === tenantId &&
        !r.deletedAt &&
        ((r.fromKind === kind && r.fromId === id) || (r.toKind === kind && r.toId === id)),
    );
  }
  async listByTenant(tenantId: string) {
    return [...this.byId.values()].filter((r) => r.tenantId === tenantId);
  }
  async findEquivalent(
    tenantId: string,
    relation: Pick<FamilyRelationship, 'fromKind' | 'fromId' | 'toKind' | 'toId' | 'relationKind'>,
  ) {
    return (
      [...this.byId.values()].find(
        (r) =>
          r.tenantId === tenantId &&
          !r.deletedAt &&
          r.fromKind === relation.fromKind &&
          r.fromId === relation.fromId &&
          r.toKind === relation.toKind &&
          r.toId === relation.toId &&
          r.relationKind === relation.relationKind,
      ) ?? null
    );
  }
  async create(entity: FamilyRelationship) {
    this.byId.set(entity.id, entity);
  }
  async update(entity: FamilyRelationship) {
    this.byId.set(entity.id, entity);
  }
}

export class InMemoryPersonFraternalRecordRepository implements IPersonFraternalRecordRepository {
  private readonly byId = new Map<string, PersonFraternalRecord>();

  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async listByPerson(tenantId: string, kind: string, id: string) {
    return [...this.byId.values()].filter(
      (r) => r.tenantId === tenantId && !r.deletedAt && r.personKind === kind && r.personId === id,
    );
  }
  async create(entity: PersonFraternalRecord) {
    this.byId.set(entity.id, entity);
  }
  async update(entity: PersonFraternalRecord) {
    this.byId.set(entity.id, entity);
  }
}
