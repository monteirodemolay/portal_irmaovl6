import {
  AssignBoardPositionUseCase,
  AssignRoleUseCase,
  AuthenticateUserUseCase,
  BootstrapTenantAdminUseCase,
  CreateAnnouncementUseCase,
  CreateBoardTermUseCase,
  CreateCommitteeUseCase,
  CreateNewsUseCase,
  CreateTenantUseCase,
  GetActiveBoardUseCase,
  GetPublicBoardUseCase,
  InviteUserUseCase,
  ListActiveAnnouncementsUseCase,
  ListAllAnnouncementsUseCase,
  ListAllNewsUseCase,
  ListAuditLogUseCase,
  ListBoardTermsUseCase,
  ListPublishedNewsUseCase,
  ListRolesUseCase,
  ListUsersUseCase,
  PublishAnnouncementUseCase,
  PublishNewsUseCase,
  RecordAuditEntryUseCase,
  RegisterMemberUseCase,
  ResolveTenantByHostUseCase,
  SearchMembersUseCase,
  SoftDeleteMemberUseCase,
  UpdateMemberSituationUseCase,
  UpdateMemberUseCase,
  UpdateMyProfileUseCase,
  UpdateNewsUseCase,
  UpdateTenantBrandingUseCase,
} from '@vl6/domain';
import { getAdminFirestore } from './firebase/admin-app';
import { FirestoreAnnouncementRepository } from './firestore/repositories/announcement.repository';
import { FirestoreAuditLogRepository } from './firestore/repositories/audit-log.repository';
import { FirestoreBoardPositionAssignmentRepository } from './firestore/repositories/board-position-assignment.repository';
import { FirestoreBoardTermRepository } from './firestore/repositories/board-term.repository';
import { FirestoreCommitteeRepository } from './firestore/repositories/committee.repository';
import { FirestoreMemberPositionHistoryRepository } from './firestore/repositories/member-position-history.repository';
import { FirestoreMemberRepository } from './firestore/repositories/member.repository';
import { FirestoreNewsRepository } from './firestore/repositories/news.repository';
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
    member: new FirestoreMemberRepository(db),
    memberPositionHistory: new FirestoreMemberPositionHistoryRepository(db),
    boardTerm: new FirestoreBoardTermRepository(db),
    boardPositionAssignment: new FirestoreBoardPositionAssignmentRepository(db),
    committee: new FirestoreCommitteeRepository(db),
    news: new FirestoreNewsRepository(db),
    announcement: new FirestoreAnnouncementRepository(db),
    auditLog: new FirestoreAuditLogRepository(db),
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
    inviteUser: new InviteUserUseCase({
      userRepository: repositories.user,
      roleRepository: repositories.role,
      clock,
    }),
    listUsers: new ListUsersUseCase({ userRepository: repositories.user }),
    listRoles: new ListRolesUseCase({ roleRepository: repositories.role }),

    registerMember: new RegisterMemberUseCase({
      memberRepository: repositories.member,
      clock,
      idGenerator,
    }),
    updateMember: new UpdateMemberUseCase({ memberRepository: repositories.member, clock }),
    updateMyProfile: new UpdateMyProfileUseCase({ memberRepository: repositories.member, clock }),
    updateMemberSituation: new UpdateMemberSituationUseCase({
      memberRepository: repositories.member,
      positionHistoryRepository: repositories.memberPositionHistory,
      clock,
    }),
    searchMembers: new SearchMembersUseCase({ memberRepository: repositories.member }),
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

    recordAuditEntry: new RecordAuditEntryUseCase({
      auditLogRepository: repositories.auditLog,
      clock,
      idGenerator,
    }),
    listAuditLog: new ListAuditLogUseCase({ auditLogRepository: repositories.auditLog }),
  };

  return { db, repositories, useCases };
}

export type ServerContainer = ReturnType<typeof createServerContainer>;
