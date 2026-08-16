import {
  AddGalleryMediaUseCase,
  AddLibraryItemUseCase,
  AssignBoardPositionUseCase,
  AssignRoleUseCase,
  SyncSystemRolePermissionsUseCase,
  AuthenticateApiKeyUseCase,
  AuthenticateUserUseCase,
  BootstrapPlatformAdminUseCase,
  BootstrapTenantAdminUseCase,
  ClaimMemberAccountUseCase,
  ConfirmAttendanceUseCase,
  CreateAnnouncementUseCase,
  CreateApiKeyUseCase,
  CreateArchiveCollectionUseCase,
  UpdateArchiveCollectionUseCase,
  PublishArchiveCollectionUseCase,
  ListArchiveCollectionsUseCase,
  ListPublishedArchiveCollectionsUseCase,
  GetArchiveCollectionBySlugUseCase,
  CreateArchiveRelationUseCase,
  ListArchiveRelationsUseCase,
  ListRelationsForNodeUseCase,
  SoftDeleteArchiveRelationUseCase,
  CreateArchiveExhibitionUseCase,
  UpdateArchiveExhibitionUseCase,
  PublishArchiveExhibitionUseCase,
  ListArchiveExhibitionsUseCase,
  ListPublishedArchiveExhibitionsUseCase,
  GetArchiveExhibitionBySlugUseCase,
  UpsertArchiveCatalogEntryUseCase,
  PublishArchiveCatalogEntryUseCase,
  ListArchiveCatalogEntriesUseCase,
  GetArchiveCatalogEntryByOrigemIdUseCase,
  SubmitArchiveContributionUseCase,
  ListMyArchiveContributionsUseCase,
  ListArchiveContributionsUseCase,
  ModerateArchiveContributionUseCase,
  CreateBoardTermUseCase,
  CreateCommitteeUseCase,
  CreateEventUseCase,
  CreateFileAssetUseCase,
  CreateFileCategoryUseCase,
  CreateGalleryAlbumUseCase,
  CreateLibraryCategoryUseCase,
  CreateLinkUseCase,
  CreateNewsCommentUseCase,
  CreateNewsUseCase,
  CreateTenantUseCase,
  GetActiveBoardUseCase,
  GetPublicBoardUseCase,
  GetPublicMemberProfileUseCase,
  InviteUserUseCase,
  ListActiveAnnouncementsUseCase,
  ListActiveLinksUseCase,
  ListAllAnnouncementsUseCase,
  ListAllEventsUseCase,
  ListAllFileAssetsUseCase,
  ListAllLibraryItemsUseCase,
  ListAllLinksUseCase,
  ListAllNewsUseCase,
  ListAllTenantsUseCase,
  ListApiKeysUseCase,
  ListApprovedNewsCommentsUseCase,
  ListAuditLogUseCase,
  ListBoardTermsUseCase,
  ListCentralProfilesAdminViewUseCase,
  ListCommitteesByGestaoUseCase,
  ListEventAttendeesUseCase,
  ListFileCategoriesUseCase,
  ListGalleryAlbumsUseCase,
  ListGalleryMediaByAlbumUseCase,
  ListLibraryCategoriesUseCase,
  ListLibraryItemsByCategoryUseCase,
  ListMyCommitteesUseCase,
  ListMyFavoritesUseCase,
  ListMyNotificationsUseCase,
  ListPendingNewsCommentsUseCase,
  ListPublishedFilesByCategoryUseCase,
  ListPublishedNewsUseCase,
  ListRolesUseCase,
  ListUpcomingEventsUseCase,
  ListUsersUseCase,
  MarkNotificationAsReadUseCase,
  ModerateNewsCommentUseCase,
  NotifyRecipientUseCase,
  PublishAnnouncementUseCase,
  PublishFileAssetUseCase,
  PublishNewsUseCase,
  ReactivateCentralProfileUseCase,
  RecordAuditEntryUseCase,
  RecordFileDownloadUseCase,
  RecordFileViewUseCase,
  RecordLibraryDownloadUseCase,
  RecordLibraryViewUseCase,
  RegisterMemberUseCase,
  RequestDomainVerificationUseCase,
  ResolveTenantByHostUseCase,
  RevokeApiKeyUseCase,
  SearchDirectoryUseCase,
  SearchMembersUseCase,
  ListUpcomingAnniversariesUseCase,
  SetTenantActiveUseCase,
  SetUserStatusUseCase,
  SoftDeleteFileAssetUseCase,
  SoftDeleteMemberUseCase,
  SuspendCentralProfileUseCase,
  ToggleLibraryFavoriteUseCase,
  UpdateCentralProfileUseCase,
  UpdateCommitteeUseCase,
  UpdateFileAssetUseCase,
  UpdateMemberSituationUseCase,
  UpdateMemberUseCase,
  UpdateMyProfileUseCase,
  UpdateNewsUseCase,
  UpdateNotificationPreferenceUseCase,
  UpdatePublicationSettingsUseCase,
  UpdateTenantBrandingUseCase,
  UpdateTenantSettingsUseCase,
  VerifyDomainUseCase,
  WithdrawFromDirectoryUseCase,
} from '@vl6/domain';
import { withAudit } from './audit/with-audit';
import { NodeDnsResolver } from './dns/node-dns-resolver';
import { getAdminFirestore } from './firebase/admin-app';
import { NodeApiKeyGenerator } from './security/node-api-key-generator';
import { FirestoreAnnouncementRepository } from './firestore/repositories/announcement.repository';
import { FirestoreApiKeyRepository } from './firestore/repositories/api-key.repository';
import { FirestoreArchiveCollectionRepository } from './firestore/repositories/archive-collection.repository';
import { FirestoreArchiveRelationRepository } from './firestore/repositories/archive-relation.repository';
import { FirestoreArchiveExhibitionRepository } from './firestore/repositories/archive-exhibition.repository';
import { FirestoreArchiveCatalogEntryRepository } from './firestore/repositories/archive-catalog-entry.repository';
import { FirestoreArchiveContributionRepository } from './firestore/repositories/archive-contribution.repository';
import { FirestoreAuditLogRepository } from './firestore/repositories/audit-log.repository';
import { FirestoreBoardPositionAssignmentRepository } from './firestore/repositories/board-position-assignment.repository';
import { FirestoreBoardTermRepository } from './firestore/repositories/board-term.repository';
import { FirestoreCommitteeRepository } from './firestore/repositories/committee.repository';
import { FirestoreEventRepository } from './firestore/repositories/event.repository';
import { FirestoreEventAttendanceRepository } from './firestore/repositories/event-attendance.repository';
import { FirestoreFileAssetRepository } from './firestore/repositories/file-asset.repository';
import { FirestoreFileCategoryRepository } from './firestore/repositories/file-category.repository';
import { FirestoreGalleryAlbumRepository } from './firestore/repositories/gallery-album.repository';
import { FirestoreGalleryMediaRepository } from './firestore/repositories/gallery-media.repository';
import { FirestoreLibraryCategoryRepository } from './firestore/repositories/library-category.repository';
import { FirestoreLibraryFavoriteRepository } from './firestore/repositories/library-favorite.repository';
import { FirestoreLibraryItemRepository } from './firestore/repositories/library-item.repository';
import { FirestoreLinkRepository } from './firestore/repositories/link.repository';
import { FirestoreMemberCentralProfileRepository } from './firestore/repositories/member-central-profile.repository';
import { FirestoreMemberPositionHistoryRepository } from './firestore/repositories/member-position-history.repository';
import { FirestoreMemberRepository } from './firestore/repositories/member.repository';
import { FirestoreNewsCommentRepository } from './firestore/repositories/news-comment.repository';
import { FirestoreNewsRepository } from './firestore/repositories/news.repository';
import { FirestoreNotificationRepository } from './firestore/repositories/notification.repository';
import { FirestoreNotificationPreferenceRepository } from './firestore/repositories/notification-preference.repository';
import { FirestorePublicationConsentRepository } from './firestore/repositories/publication-consent.repository';
import { FirestorePublicationSettingsRepository } from './firestore/repositories/publication-settings.repository';
import { FirestoreRoleRepository } from './firestore/repositories/role.repository';
import { FirestoreTenantRepository } from './firestore/repositories/tenant.repository';
import { FirestoreTenantBrandingRepository } from './firestore/repositories/tenant-branding.repository';
import { FirestoreTenantDomainVerificationRepository } from './firestore/repositories/tenant-domain-verification.repository';
import { FirestoreTenantSettingsRepository } from './firestore/repositories/tenant-settings.repository';
import { FirestoreUserRepository } from './firestore/repositories/user.repository';
import { SystemClock } from './adapters/system-clock';
import { FirestoreIdGenerator } from './adapters/firestore-id-generator';
import { NoopNotificationGateway } from './adapters/noop-notification-gateway';

/**
 * Composition root do servidor — instancia repositórios Firestore reais e os
 * injeta nos casos de uso do domínio. Único lugar da aplicação que conhece
 * simultaneamente `packages/domain` (interfaces) e `packages/infra`
 * (implementações); toda Server Action / Route Handler consome apenas isto,
 * nunca importa um repositório Firestore diretamente.
 */
export function createServerContainer() {
  const db = getAdminFirestore();

  const clock = new SystemClock();
  const idGenerator = new FirestoreIdGenerator(db);
  const auditLogRepository = new FirestoreAuditLogRepository(db);
  const auditDeps = { auditLogRepository, clock, idGenerator };

  // As 8 coleções que a extinta Cloud Function `onEntityAudited` cobria
  // (docs/architecture/06 §6.7) — `withAudit` registra create/update/
  // delete/restore automaticamente, sem cada caso de uso precisar lembrar.
  const repositories = {
    tenant: new FirestoreTenantRepository(db),
    tenantBranding: new FirestoreTenantBrandingRepository(db),
    tenantSettings: new FirestoreTenantSettingsRepository(db),
    tenantDomainVerification: new FirestoreTenantDomainVerificationRepository(db),
    user: withAudit(new FirestoreUserRepository(db), 'users', auditDeps),
    role: withAudit(new FirestoreRoleRepository(db), 'roles', auditDeps),
    member: withAudit(new FirestoreMemberRepository(db), 'members', auditDeps),
    memberPositionHistory: new FirestoreMemberPositionHistoryRepository(db),
    boardTerm: withAudit(new FirestoreBoardTermRepository(db), 'boardTerms', auditDeps),
    boardPositionAssignment: withAudit(
      new FirestoreBoardPositionAssignmentRepository(db),
      'boardPositionAssignments',
      auditDeps,
    ),
    committee: withAudit(new FirestoreCommitteeRepository(db), 'committees', auditDeps),
    news: withAudit(new FirestoreNewsRepository(db), 'news', auditDeps),
    announcement: withAudit(new FirestoreAnnouncementRepository(db), 'announcements', auditDeps),
    auditLog: auditLogRepository,
    fileCategory: new FirestoreFileCategoryRepository(db),
    fileAsset: new FirestoreFileAssetRepository(db),
    libraryCategory: new FirestoreLibraryCategoryRepository(db),
    libraryItem: new FirestoreLibraryItemRepository(db),
    libraryFavorite: new FirestoreLibraryFavoriteRepository(db),
    event: new FirestoreEventRepository(db),
    eventAttendance: new FirestoreEventAttendanceRepository(db),
    notification: new FirestoreNotificationRepository(db),
    notificationPreference: new FirestoreNotificationPreferenceRepository(db),
    link: new FirestoreLinkRepository(db),
    galleryAlbum: new FirestoreGalleryAlbumRepository(db),
    galleryMedia: new FirestoreGalleryMediaRepository(db),
    newsComment: new FirestoreNewsCommentRepository(db),
    apiKey: new FirestoreApiKeyRepository(db),
    memberCentralProfile: withAudit(
      new FirestoreMemberCentralProfileRepository(db),
      'memberCentralProfiles',
      auditDeps,
    ),
    publicationSettings: withAudit(
      new FirestorePublicationSettingsRepository(db),
      'publicationSettings',
      auditDeps,
    ),
    publicationConsent: new FirestorePublicationConsentRepository(db),
    archiveCollection: withAudit(
      new FirestoreArchiveCollectionRepository(db),
      'archiveCollections',
      auditDeps,
    ),
    archiveRelation: withAudit(
      new FirestoreArchiveRelationRepository(db),
      'archiveRelations',
      auditDeps,
    ),
    archiveExhibition: withAudit(
      new FirestoreArchiveExhibitionRepository(db),
      'archiveExhibitions',
      auditDeps,
    ),
    archiveCatalogEntry: withAudit(
      new FirestoreArchiveCatalogEntryRepository(db),
      'archiveCatalogEntries',
      auditDeps,
    ),
    archiveContribution: withAudit(
      new FirestoreArchiveContributionRepository(db),
      'archiveContributions',
      auditDeps,
    ),
  };

  const notificationGateway = new NoopNotificationGateway();
  const dnsResolver = new NodeDnsResolver();
  const apiKeyGenerator = new NodeApiKeyGenerator();

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
    updateTenantSettings: new UpdateTenantSettingsUseCase({
      settingsRepository: repositories.tenantSettings,
      clock,
    }),
    resolveTenantByHost: new ResolveTenantByHostUseCase({ tenantRepository: repositories.tenant }),
    requestDomainVerification: new RequestDomainVerificationUseCase({
      domainVerificationRepository: repositories.tenantDomainVerification,
      clock,
      idGenerator,
    }),
    verifyDomain: new VerifyDomainUseCase({
      domainVerificationRepository: repositories.tenantDomainVerification,
      tenantRepository: repositories.tenant,
      dnsResolver,
      clock,
    }),
    listAllTenants: new ListAllTenantsUseCase({ tenantRepository: repositories.tenant }),
    setTenantActive: new SetTenantActiveUseCase({ tenantRepository: repositories.tenant, clock }),
    authenticateUser: new AuthenticateUserUseCase({ userRepository: repositories.user, clock }),
    assignRole: new AssignRoleUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
    }),
    syncSystemRolePermissions: new SyncSystemRolePermissionsUseCase({
      roleRepository: repositories.role,
      clock,
    }),
    setUserStatus: new SetUserStatusUseCase({ userRepository: repositories.user, clock }),
    bootstrapTenantAdmin: new BootstrapTenantAdminUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
    }),
    bootstrapPlatformAdmin: new BootstrapPlatformAdminUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
      idGenerator,
    }),
    inviteUser: new InviteUserUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
    }),
    listUsers: new ListUsersUseCase({ userRepository: repositories.user }),
    listRoles: new ListRolesUseCase({ roleRepository: repositories.role }),
    createApiKey: new CreateApiKeyUseCase({
      apiKeyRepository: repositories.apiKey,
      apiKeyGenerator,
      clock,
      idGenerator,
    }),
    listApiKeys: new ListApiKeysUseCase({ apiKeyRepository: repositories.apiKey }),
    revokeApiKey: new RevokeApiKeyUseCase({ apiKeyRepository: repositories.apiKey, clock }),
    authenticateApiKey: new AuthenticateApiKeyUseCase({
      apiKeyRepository: repositories.apiKey,
      apiKeyGenerator,
      clock,
    }),

    registerMember: new RegisterMemberUseCase({
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    updateMember: new UpdateMemberUseCase({ memberRepository: repositories.member, clock }),
    updateMyProfile: new UpdateMyProfileUseCase({ memberRepository: repositories.member, clock }),
    claimMemberAccount: new ClaimMemberAccountUseCase({
      memberRepository: repositories.member,
      clock,
    }),
    updateMemberSituation: new UpdateMemberSituationUseCase({
      memberRepository: repositories.member,
      positionHistoryRepository: repositories.memberPositionHistory,
      clock,
    }),
    searchMembers: new SearchMembersUseCase({
      memberRepository: repositories.member,
      boardTermRepository: repositories.boardTerm,
      boardPositionAssignmentRepository: repositories.boardPositionAssignment,
    }),
    listUpcomingAnniversaries: new ListUpcomingAnniversariesUseCase({
      memberRepository: repositories.member,
      clock,
    }),
    softDeleteMember: new SoftDeleteMemberUseCase({ memberRepository: repositories.member, clock }),

    createBoardTerm: new CreateBoardTermUseCase({
      boardTermRepository: repositories.boardTerm,
      clock,
      idGenerator,
    }),
    assignBoardPosition: new AssignBoardPositionUseCase({
      boardTermRepository: repositories.boardTerm,
      assignmentRepository: repositories.boardPositionAssignment,
      memberRepository: repositories.member,
      positionHistoryRepository: repositories.memberPositionHistory,
      clock,
      idGenerator,
    }),
    getActiveBoard: new GetActiveBoardUseCase({
      boardTermRepository: repositories.boardTerm,
      assignmentRepository: repositories.boardPositionAssignment,
      memberRepository: repositories.member,
    }),
    getPublicBoard: new GetPublicBoardUseCase({
      boardTermRepository: repositories.boardTerm,
      assignmentRepository: repositories.boardPositionAssignment,
      memberRepository: repositories.member,
    }),
    listBoardTerms: new ListBoardTermsUseCase({ boardTermRepository: repositories.boardTerm }),
    createCommittee: new CreateCommitteeUseCase({
      committeeRepository: repositories.committee,
      boardTermRepository: repositories.boardTerm,
      clock,
      idGenerator,
    }),
    listCommitteesByGestao: new ListCommitteesByGestaoUseCase({
      committeeRepository: repositories.committee,
    }),
    listMyCommittees: new ListMyCommitteesUseCase({
      committeeRepository: repositories.committee,
      memberRepository: repositories.member,
    }),
    updateCommittee: new UpdateCommitteeUseCase({
      committeeRepository: repositories.committee,
      memberRepository: repositories.member,
      clock,
    }),

    updateCentralProfile: new UpdateCentralProfileUseCase({
      memberCentralProfileRepository: repositories.memberCentralProfile,
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    updatePublicationSettings: new UpdatePublicationSettingsUseCase({
      publicationSettingsRepository: repositories.publicationSettings,
      publicationConsentRepository: repositories.publicationConsent,
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    withdrawFromDirectory: new WithdrawFromDirectoryUseCase({
      publicationSettingsRepository: repositories.publicationSettings,
      publicationConsentRepository: repositories.publicationConsent,
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    getPublicMemberProfile: new GetPublicMemberProfileUseCase({
      memberRepository: repositories.member,
      memberCentralProfileRepository: repositories.memberCentralProfile,
      publicationSettingsRepository: repositories.publicationSettings,
    }),
    searchDirectory: new SearchDirectoryUseCase({
      memberRepository: repositories.member,
      memberCentralProfileRepository: repositories.memberCentralProfile,
      publicationSettingsRepository: repositories.publicationSettings,
    }),
    suspendCentralProfile: new SuspendCentralProfileUseCase({
      publicationSettingsRepository: repositories.publicationSettings,
      clock,
    }),
    reactivateCentralProfile: new ReactivateCentralProfileUseCase({
      publicationSettingsRepository: repositories.publicationSettings,
      clock,
    }),
    listCentralProfilesAdminView: new ListCentralProfilesAdminViewUseCase({
      publicationSettingsRepository: repositories.publicationSettings,
      memberRepository: repositories.member,
    }),

    createNews: new CreateNewsUseCase({ newsRepository: repositories.news, clock, idGenerator }),
    updateNews: new UpdateNewsUseCase({ newsRepository: repositories.news, clock }),
    publishNews: new PublishNewsUseCase({ newsRepository: repositories.news, clock }),
    listPublishedNews: new ListPublishedNewsUseCase({ newsRepository: repositories.news }),
    listAllNews: new ListAllNewsUseCase({ newsRepository: repositories.news }),
    createAnnouncement: new CreateAnnouncementUseCase({
      announcementRepository: repositories.announcement,
      clock,
      idGenerator,
    }),
    publishAnnouncement: new PublishAnnouncementUseCase({
      announcementRepository: repositories.announcement,
      clock,
    }),
    listActiveAnnouncements: new ListActiveAnnouncementsUseCase({
      announcementRepository: repositories.announcement,
    }),
    listAllAnnouncements: new ListAllAnnouncementsUseCase({
      announcementRepository: repositories.announcement,
    }),
    createNewsComment: new CreateNewsCommentUseCase({
      newsCommentRepository: repositories.newsComment,
      newsRepository: repositories.news,
      clock,
      idGenerator,
    }),
    moderateNewsComment: new ModerateNewsCommentUseCase({
      newsCommentRepository: repositories.newsComment,
      clock,
    }),
    listApprovedNewsComments: new ListApprovedNewsCommentsUseCase({
      newsCommentRepository: repositories.newsComment,
    }),
    listPendingNewsComments: new ListPendingNewsCommentsUseCase({
      newsCommentRepository: repositories.newsComment,
    }),

    recordAuditEntry: new RecordAuditEntryUseCase({
      auditLogRepository: repositories.auditLog,
      clock,
      idGenerator,
    }),
    listAuditLog: new ListAuditLogUseCase({ auditLogRepository: repositories.auditLog }),

    createFileCategory: new CreateFileCategoryUseCase({
      fileCategoryRepository: repositories.fileCategory,
      clock,
      idGenerator,
    }),
    listFileCategories: new ListFileCategoriesUseCase({
      fileCategoryRepository: repositories.fileCategory,
    }),
    createFileAsset: new CreateFileAssetUseCase({
      fileAssetRepository: repositories.fileAsset,
      clock,
      idGenerator,
    }),
    updateFileAsset: new UpdateFileAssetUseCase({
      fileAssetRepository: repositories.fileAsset,
      clock,
    }),
    publishFileAsset: new PublishFileAssetUseCase({
      fileAssetRepository: repositories.fileAsset,
      clock,
    }),
    listAllFileAssets: new ListAllFileAssetsUseCase({
      fileAssetRepository: repositories.fileAsset,
    }),
    listPublishedFilesByCategory: new ListPublishedFilesByCategoryUseCase({
      fileAssetRepository: repositories.fileAsset,
    }),
    recordFileView: new RecordFileViewUseCase({ fileAssetRepository: repositories.fileAsset }),
    recordFileDownload: new RecordFileDownloadUseCase({
      fileAssetRepository: repositories.fileAsset,
    }),
    softDeleteFileAsset: new SoftDeleteFileAssetUseCase({
      fileAssetRepository: repositories.fileAsset,
      clock,
    }),

    createLibraryCategory: new CreateLibraryCategoryUseCase({
      libraryCategoryRepository: repositories.libraryCategory,
      clock,
      idGenerator,
    }),
    listLibraryCategories: new ListLibraryCategoriesUseCase({
      libraryCategoryRepository: repositories.libraryCategory,
    }),
    addLibraryItem: new AddLibraryItemUseCase({
      libraryItemRepository: repositories.libraryItem,
      fileAssetRepository: repositories.fileAsset,
      clock,
      idGenerator,
    }),
    listLibraryItemsByCategory: new ListLibraryItemsByCategoryUseCase({
      libraryItemRepository: repositories.libraryItem,
    }),
    listAllLibraryItems: new ListAllLibraryItemsUseCase({
      libraryItemRepository: repositories.libraryItem,
    }),
    toggleLibraryFavorite: new ToggleLibraryFavoriteUseCase({
      favoriteRepository: repositories.libraryFavorite,
      clock,
      idGenerator,
    }),
    listMyFavorites: new ListMyFavoritesUseCase({
      favoriteRepository: repositories.libraryFavorite,
    }),
    recordLibraryView: new RecordLibraryViewUseCase({
      libraryItemRepository: repositories.libraryItem,
      fileAssetRepository: repositories.fileAsset,
    }),
    recordLibraryDownload: new RecordLibraryDownloadUseCase({
      libraryItemRepository: repositories.libraryItem,
      fileAssetRepository: repositories.fileAsset,
    }),

    createEvent: new CreateEventUseCase({
      eventRepository: repositories.event,
      clock,
      idGenerator,
    }),
    listUpcomingEvents: new ListUpcomingEventsUseCase({
      eventRepository: repositories.event,
      clock,
    }),
    listAllEvents: new ListAllEventsUseCase({ eventRepository: repositories.event }),
    confirmAttendance: new ConfirmAttendanceUseCase({
      eventRepository: repositories.event,
      attendanceRepository: repositories.eventAttendance,
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    listEventAttendees: new ListEventAttendeesUseCase({
      attendanceRepository: repositories.eventAttendance,
    }),

    notifyRecipient: new NotifyRecipientUseCase({
      notificationRepository: repositories.notification,
      notificationPreferenceRepository: repositories.notificationPreference,
      notificationGateway,
      clock,
      idGenerator,
    }),
    listMyNotifications: new ListMyNotificationsUseCase({
      notificationRepository: repositories.notification,
    }),
    markNotificationAsRead: new MarkNotificationAsReadUseCase({
      notificationRepository: repositories.notification,
      clock,
    }),
    updateNotificationPreference: new UpdateNotificationPreferenceUseCase({
      preferenceRepository: repositories.notificationPreference,
      clock,
      idGenerator,
    }),
    createLink: new CreateLinkUseCase({ linkRepository: repositories.link, clock, idGenerator }),
    listActiveLinks: new ListActiveLinksUseCase({ linkRepository: repositories.link }),
    listAllLinks: new ListAllLinksUseCase({ linkRepository: repositories.link }),

    createGalleryAlbum: new CreateGalleryAlbumUseCase({
      galleryAlbumRepository: repositories.galleryAlbum,
      clock,
      idGenerator,
    }),
    listGalleryAlbums: new ListGalleryAlbumsUseCase({
      galleryAlbumRepository: repositories.galleryAlbum,
    }),
    addGalleryMedia: new AddGalleryMediaUseCase({
      galleryMediaRepository: repositories.galleryMedia,
      galleryAlbumRepository: repositories.galleryAlbum,
      clock,
      idGenerator,
    }),
    listGalleryMediaByAlbum: new ListGalleryMediaByAlbumUseCase({
      galleryMediaRepository: repositories.galleryMedia,
    }),

    createArchiveCollection: new CreateArchiveCollectionUseCase({
      archiveCollectionRepository: repositories.archiveCollection,
      clock,
      idGenerator,
    }),
    updateArchiveCollection: new UpdateArchiveCollectionUseCase({
      archiveCollectionRepository: repositories.archiveCollection,
      clock,
    }),
    publishArchiveCollection: new PublishArchiveCollectionUseCase({
      archiveCollectionRepository: repositories.archiveCollection,
      clock,
    }),
    listArchiveCollections: new ListArchiveCollectionsUseCase({
      archiveCollectionRepository: repositories.archiveCollection,
    }),
    listPublishedArchiveCollections: new ListPublishedArchiveCollectionsUseCase({
      archiveCollectionRepository: repositories.archiveCollection,
    }),
    getArchiveCollectionBySlug: new GetArchiveCollectionBySlugUseCase({
      archiveCollectionRepository: repositories.archiveCollection,
    }),
    createArchiveRelation: new CreateArchiveRelationUseCase({
      archiveRelationRepository: repositories.archiveRelation,
      clock,
      idGenerator,
    }),
    listArchiveRelations: new ListArchiveRelationsUseCase({
      archiveRelationRepository: repositories.archiveRelation,
    }),
    listRelationsForNode: new ListRelationsForNodeUseCase({
      archiveRelationRepository: repositories.archiveRelation,
    }),
    softDeleteArchiveRelation: new SoftDeleteArchiveRelationUseCase({
      archiveRelationRepository: repositories.archiveRelation,
      clock,
    }),
    createArchiveExhibition: new CreateArchiveExhibitionUseCase({
      archiveExhibitionRepository: repositories.archiveExhibition,
      clock,
      idGenerator,
    }),
    updateArchiveExhibition: new UpdateArchiveExhibitionUseCase({
      archiveExhibitionRepository: repositories.archiveExhibition,
      clock,
    }),
    publishArchiveExhibition: new PublishArchiveExhibitionUseCase({
      archiveExhibitionRepository: repositories.archiveExhibition,
      clock,
    }),
    listArchiveExhibitions: new ListArchiveExhibitionsUseCase({
      archiveExhibitionRepository: repositories.archiveExhibition,
    }),
    listPublishedArchiveExhibitions: new ListPublishedArchiveExhibitionsUseCase({
      archiveExhibitionRepository: repositories.archiveExhibition,
    }),
    getArchiveExhibitionBySlug: new GetArchiveExhibitionBySlugUseCase({
      archiveExhibitionRepository: repositories.archiveExhibition,
    }),
    upsertArchiveCatalogEntry: new UpsertArchiveCatalogEntryUseCase({
      archiveCatalogEntryRepository: repositories.archiveCatalogEntry,
      clock,
      idGenerator,
    }),
    publishArchiveCatalogEntry: new PublishArchiveCatalogEntryUseCase({
      archiveCatalogEntryRepository: repositories.archiveCatalogEntry,
      clock,
    }),
    listArchiveCatalogEntries: new ListArchiveCatalogEntriesUseCase({
      archiveCatalogEntryRepository: repositories.archiveCatalogEntry,
    }),
    getArchiveCatalogEntryByOrigemId: new GetArchiveCatalogEntryByOrigemIdUseCase({
      archiveCatalogEntryRepository: repositories.archiveCatalogEntry,
    }),
    submitArchiveContribution: new SubmitArchiveContributionUseCase({
      archiveContributionRepository: repositories.archiveContribution,
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    listMyArchiveContributions: new ListMyArchiveContributionsUseCase({
      archiveContributionRepository: repositories.archiveContribution,
      memberRepository: repositories.member,
    }),
    listArchiveContributions: new ListArchiveContributionsUseCase({
      archiveContributionRepository: repositories.archiveContribution,
    }),
    moderateArchiveContribution: new ModerateArchiveContributionUseCase({
      archiveContributionRepository: repositories.archiveContribution,
      clock,
    }),
  };

  return { db, repositories, useCases };
}

export type ServerContainer = ReturnType<typeof createServerContainer>;
