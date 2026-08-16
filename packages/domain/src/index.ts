// Shared kernel
export * from './shared/base-entity';
export * from './shared/result';
export * from './shared/pagination';
export * from './shared/auth-context';
export * from './shared/ports';
export * from './shared/address';

// Tenancy
export * from './modules/tenancy/entities/tenant.entity';
export * from './modules/tenancy/entities/tenant-branding.entity';
export * from './modules/tenancy/entities/tenant-settings.entity';
export * from './modules/tenancy/entities/tenant-domain-verification.entity';
export * from './modules/tenancy/repositories/tenant.repository';
export * from './modules/tenancy/repositories/tenant-branding.repository';
export * from './modules/tenancy/repositories/tenant-settings.repository';
export * from './modules/tenancy/repositories/tenant-domain-verification.repository';
export * from './modules/tenancy/services/dns-resolver';
export * from './modules/tenancy/use-cases/create-tenant.use-case';
export * from './modules/tenancy/use-cases/update-tenant-branding.use-case';
export * from './modules/tenancy/use-cases/update-tenant-settings.use-case';
export * from './modules/tenancy/use-cases/resolve-tenant-by-host.use-case';
export * from './modules/tenancy/use-cases/request-domain-verification.use-case';
export * from './modules/tenancy/use-cases/verify-domain.use-case';
export * from './modules/tenancy/use-cases/list-all-tenants.use-case';
export * from './modules/tenancy/use-cases/set-tenant-active.use-case';

// Identity & Access
export * from './modules/identity-access/entities/user.entity';
export * from './modules/identity-access/entities/role.entity';
export * from './modules/identity-access/entities/api-key.entity';
export * from './modules/identity-access/repositories/user.repository';
export * from './modules/identity-access/repositories/role.repository';
export * from './modules/identity-access/repositories/api-key.repository';
export * from './modules/identity-access/services/compute-user-claims';
export * from './modules/identity-access/services/api-key-generator';
export * from './modules/identity-access/use-cases/authenticate-user.use-case';
export * from './modules/identity-access/use-cases/assign-role.use-case';
export * from './modules/identity-access/use-cases/sync-system-role-permissions.use-case';
export * from './modules/identity-access/use-cases/set-user-status.use-case';
export * from './modules/identity-access/use-cases/bootstrap-platform-admin.use-case';
export * from './modules/identity-access/use-cases/bootstrap-tenant-admin.use-case';
export * from './modules/identity-access/use-cases/invite-user.use-case';
export * from './modules/identity-access/use-cases/list-users.use-case';
export * from './modules/identity-access/use-cases/list-roles.use-case';
export * from './modules/identity-access/use-cases/create-api-key.use-case';
export * from './modules/identity-access/use-cases/list-api-keys.use-case';
export * from './modules/identity-access/use-cases/revoke-api-key.use-case';
export * from './modules/identity-access/use-cases/authenticate-api-key.use-case';

// Membership
export * from './modules/membership/entities/member.entity';
export * from './modules/membership/entities/member-position-history.entity';
export * from './modules/membership/repositories/member.repository';
export * from './modules/membership/repositories/member-position-history.repository';
export * from './modules/membership/use-cases/register-member.use-case';
export * from './modules/membership/use-cases/update-member.use-case';
export * from './modules/membership/use-cases/update-my-profile.use-case';
export * from './modules/membership/use-cases/update-member-situation.use-case';
export * from './modules/membership/use-cases/search-members.use-case';
export * from './modules/membership/use-cases/list-upcoming-anniversaries.use-case';
export * from './modules/membership/use-cases/soft-delete-member.use-case';
export * from './modules/membership/use-cases/claim-member-account.use-case';

// Governance
export * from './modules/governance/entities/board-term.entity';
export * from './modules/governance/entities/board-position-assignment.entity';
export * from './modules/governance/entities/committee.entity';
export * from './modules/governance/repositories/board-term.repository';
export * from './modules/governance/repositories/board-position-assignment.repository';
export * from './modules/governance/repositories/committee.repository';
export * from './modules/governance/use-cases/create-board-term.use-case';
export * from './modules/governance/use-cases/assign-board-position.use-case';
export * from './modules/governance/use-cases/get-active-board.use-case';
export * from './modules/governance/use-cases/get-public-board.use-case';
export * from './modules/governance/use-cases/list-board-terms.use-case';
export * from './modules/governance/use-cases/create-committee.use-case';
export * from './modules/governance/use-cases/list-committees.use-case';
export * from './modules/governance/use-cases/update-committee.use-case';

// Central dos Irmãos VL6
export * from './modules/central/entities/member-central-profile.entity';
export * from './modules/central/entities/publication-settings.entity';
export * from './modules/central/entities/publication-consent.entity';
export * from './modules/central/repositories/member-central-profile.repository';
export * from './modules/central/repositories/publication-settings.repository';
export * from './modules/central/repositories/publication-consent.repository';
export * from './modules/central/dtos/public-member-profile.dto';
export * from './modules/central/lib/resolve-area-atuacao';
export * from './modules/central/lib/profile-completion';
export * from './modules/central/lib/directory-metrics';
export * from './modules/central/use-cases/update-central-profile.use-case';
export * from './modules/central/use-cases/update-publication-settings.use-case';
export * from './modules/central/use-cases/withdraw-from-directory.use-case';
export * from './modules/central/use-cases/get-public-member-profile.use-case';
export * from './modules/central/use-cases/search-directory.use-case';
export * from './modules/central/use-cases/suspend-central-profile.use-case';
export * from './modules/central/use-cases/reactivate-central-profile.use-case';
export * from './modules/central/use-cases/list-central-profiles-admin-view.use-case';

// Content
export * from './modules/content/entities/news.entity';
export * from './modules/content/entities/announcement.entity';
export * from './modules/content/entities/news-comment.entity';
export * from './modules/content/repositories/news.repository';
export * from './modules/content/repositories/announcement.repository';
export * from './modules/content/repositories/news-comment.repository';
export * from './modules/content/use-cases/create-news.use-case';
export * from './modules/content/use-cases/update-news.use-case';
export * from './modules/content/use-cases/publish-news.use-case';
export * from './modules/content/use-cases/list-published-news.use-case';
export * from './modules/content/use-cases/list-all-news.use-case';
export * from './modules/content/use-cases/create-announcement.use-case';
export * from './modules/content/use-cases/publish-announcement.use-case';
export * from './modules/content/use-cases/list-active-announcements.use-case';
export * from './modules/content/use-cases/list-all-announcements.use-case';
export * from './modules/content/use-cases/create-news-comment.use-case';
export * from './modules/content/use-cases/moderate-news-comment.use-case';
export * from './modules/content/use-cases/list-news-comments.use-case';

// Audit
export * from './modules/audit/entities/audit-log.entity';
export * from './modules/audit/repositories/audit-log.repository';
export * from './modules/audit/use-cases/record-audit-entry.use-case';
export * from './modules/audit/use-cases/list-audit-log.use-case';

// Document Management
export * from './modules/document-management/entities/file-asset.entity';
export * from './modules/document-management/entities/file-category.entity';
export * from './modules/document-management/repositories/file-asset.repository';
export * from './modules/document-management/repositories/file-category.repository';
export * from './modules/document-management/use-cases/create-file-category.use-case';
export * from './modules/document-management/use-cases/list-file-categories.use-case';
export * from './modules/document-management/use-cases/create-file-asset.use-case';
export * from './modules/document-management/use-cases/update-file-asset.use-case';
export * from './modules/document-management/use-cases/publish-file-asset.use-case';
export * from './modules/document-management/use-cases/list-file-assets.use-case';
export * from './modules/document-management/use-cases/record-file-interaction.use-case';
export * from './modules/document-management/use-cases/soft-delete-file-asset.use-case';

// Library
export * from './modules/library/entities/library-category.entity';
export * from './modules/library/entities/library-item.entity';
export * from './modules/library/entities/library-favorite.entity';
export * from './modules/library/repositories/library-category.repository';
export * from './modules/library/repositories/library-item.repository';
export * from './modules/library/repositories/library-favorite.repository';
export * from './modules/library/use-cases/create-library-category.use-case';
export * from './modules/library/use-cases/list-library-categories.use-case';
export * from './modules/library/use-cases/add-library-item.use-case';
export * from './modules/library/use-cases/list-library-items.use-case';
export * from './modules/library/use-cases/toggle-library-favorite.use-case';
export * from './modules/library/use-cases/list-my-favorites.use-case';
export * from './modules/library/use-cases/record-library-interaction.use-case';

// Agenda
export * from './modules/agenda/entities/event.entity';
export * from './modules/agenda/entities/event-attendance.entity';
export * from './modules/agenda/repositories/event.repository';
export * from './modules/agenda/repositories/event-attendance.repository';
export * from './modules/agenda/use-cases/create-event.use-case';
export * from './modules/agenda/use-cases/list-upcoming-events.use-case';
export * from './modules/agenda/use-cases/confirm-attendance.use-case';
export * from './modules/agenda/use-cases/list-event-attendees.use-case';

// Notification
export * from './modules/notification/entities/notification.entity';
export * from './modules/notification/entities/notification-preference.entity';
export * from './modules/notification/entities/link.entity';
export * from './modules/notification/repositories/notification.repository';
export * from './modules/notification/repositories/notification-preference.repository';
export * from './modules/notification/repositories/link.repository';
export * from './modules/notification/services/notification-gateway';
export * from './modules/notification/use-cases/notify-recipient.use-case';
export * from './modules/notification/use-cases/list-my-notifications.use-case';
export * from './modules/notification/use-cases/mark-notification-as-read.use-case';
export * from './modules/notification/use-cases/update-notification-preference.use-case';
export * from './modules/notification/use-cases/create-link.use-case';
export * from './modules/notification/use-cases/list-links.use-case';

// Gallery
export * from './modules/gallery/entities/gallery-album.entity';
export * from './modules/gallery/entities/gallery-media.entity';
export * from './modules/gallery/repositories/gallery-album.repository';
export * from './modules/gallery/repositories/gallery-media.repository';
export * from './modules/gallery/use-cases/create-gallery-album.use-case';
export * from './modules/gallery/use-cases/list-gallery-albums.use-case';
export * from './modules/gallery/use-cases/add-gallery-media.use-case';
export * from './modules/gallery/use-cases/list-gallery-media.use-case';

// Archive (Acervo VL6 — Etapa 2)
export * from './modules/archive/entities/archive-collection.entity';
export * from './modules/archive/repositories/archive-collection.repository';
export * from './modules/archive/use-cases/create-archive-collection.use-case';
export * from './modules/archive/use-cases/update-archive-collection.use-case';
export * from './modules/archive/use-cases/publish-archive-collection.use-case';
export * from './modules/archive/use-cases/list-archive-collections.use-case';
export * from './modules/archive/use-cases/list-published-archive-collections.use-case';
export * from './modules/archive/use-cases/get-archive-collection-by-slug.use-case';
export * from './modules/archive/entities/archive-relation.entity';
export * from './modules/archive/repositories/archive-relation.repository';
export * from './modules/archive/use-cases/create-archive-relation.use-case';
export * from './modules/archive/use-cases/list-archive-relations.use-case';
export * from './modules/archive/use-cases/list-relations-for-node.use-case';
export * from './modules/archive/use-cases/soft-delete-archive-relation.use-case';
export * from './modules/archive/entities/archive-exhibition.entity';
export * from './modules/archive/repositories/archive-exhibition.repository';
export * from './modules/archive/use-cases/create-archive-exhibition.use-case';
export * from './modules/archive/use-cases/update-archive-exhibition.use-case';
export * from './modules/archive/use-cases/publish-archive-exhibition.use-case';
export * from './modules/archive/use-cases/list-archive-exhibitions.use-case';
export * from './modules/archive/use-cases/list-published-archive-exhibitions.use-case';
export * from './modules/archive/use-cases/get-archive-exhibition-by-slug.use-case';
