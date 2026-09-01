import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryAuditLogRepository,
  InMemoryGoogleCalendarConnectionRepository,
  InMemoryLibraryFavoriteRepository,
  InMemoryMemberRepository,
  InMemoryNotificationRepository,
  InMemoryPersonalEventRepository,
  InMemoryPersonalNoteRepository,
  InMemoryPersonalTaskRepository,
  InMemoryRoleRepository,
  InMemoryUserRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { GoogleCalendarConnection } from '../../integrations/entities/google-calendar-connection.entity';
import type { LibraryFavorite } from '../../library/entities/library-favorite.entity';
import type { Member } from '../../membership/entities/member.entity';
import type { PersonalEvent } from '../../agenda/entities/personal-event.entity';
import type { PersonalNote } from '../../agenda/entities/personal-note.entity';
import type { PersonalTask } from '../../agenda/entities/personal-task.entity';
import type { Role } from '../entities/role.entity';
import type { User } from '../entities/user.entity';
import { DeleteMyAccountUseCase } from './delete-my-account.use-case';

const clock = new FixedClock(new Date('2026-06-01T00:00:00Z'));

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    tenantId: 't1',
    email: 'irmao@vl6.test',
    memberId: 'm1',
    roleId: 'role-membro',
    mfaHabilitado: false,
    ultimoLogin: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    statusConta: 'active',
    ...overrides,
  };
}

function buildRole(overrides: Partial<Role> = {}): Role {
  return {
    id: 'role-membro',
    tenantId: 't1',
    nome: 'Irmão',
    chave: 'membro',
    permissoes: ['event:read'],
    sistemico: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'system',
    updatedBy: 'system',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'm1',
    tenantId: 't1',
    userId: 'u1',
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 'loja-1',
    potencia: 'GOB',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildCtx(overrides: Partial<AuthContext> = {}): AuthContext {
  return { uid: 'u1', tenantId: 't1', roleId: 'role-membro', permissions: [], ...overrides };
}

function buildUseCase() {
  const userRepository = new InMemoryUserRepository();
  const roleRepository = new InMemoryRoleRepository();
  const memberRepository = new InMemoryMemberRepository();
  const personalEventRepository = new InMemoryPersonalEventRepository();
  const personalTaskRepository = new InMemoryPersonalTaskRepository();
  const personalNoteRepository = new InMemoryPersonalNoteRepository();
  const libraryFavoriteRepository = new InMemoryLibraryFavoriteRepository();
  const googleCalendarConnectionRepository = new InMemoryGoogleCalendarConnectionRepository();
  const notificationRepository = new InMemoryNotificationRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();

  const useCase = new DeleteMyAccountUseCase({
    userRepository,
    roleRepository,
    memberRepository,
    personalEventRepository,
    personalTaskRepository,
    personalNoteRepository,
    libraryFavoriteRepository,
    googleCalendarConnectionRepository,
    notificationRepository,
    auditLogRepository,
    clock,
    idGenerator: new SequentialIdGenerator(),
  });

  return {
    useCase,
    userRepository,
    roleRepository,
    memberRepository,
    personalEventRepository,
    personalTaskRepository,
    personalNoteRepository,
    libraryFavoriteRepository,
    googleCalendarConnectionRepository,
    notificationRepository,
    auditLogRepository,
  };
}

describe('DeleteMyAccountUseCase', () => {
  it('bloqueia quando o usuário é o único Administrador ativo do tenant', async () => {
    const deps = buildUseCase();
    const adminRole = buildRole({ id: 'role-admin', chave: 'admin' });
    await deps.roleRepository.create(adminRole);
    await deps.userRepository.create(buildUser({ roleId: 'role-admin' }));

    const result = await deps.useCase.execute(buildCtx({ roleId: 'role-admin' }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
    expect(await deps.userRepository.findById('u1')).not.toBeNull();
  });

  it('permite excluir quando existe outro Administrador ativo', async () => {
    const deps = buildUseCase();
    const adminRole = buildRole({ id: 'role-admin', chave: 'admin' });
    await deps.roleRepository.create(adminRole);
    await deps.userRepository.create(buildUser({ roleId: 'role-admin' }));
    await deps.userRepository.create(
      buildUser({ id: 'u2', email: 'outro@vl6.test', memberId: null, roleId: 'role-admin' }),
    );

    const result = await deps.useCase.execute(buildCtx({ uid: 'u1', roleId: 'role-admin' }));

    expect(result.ok).toBe(true);
    expect(await deps.userRepository.findById('u1')).toBeNull();
  });

  it('desvincula o Member, apaga dados pessoais e o User, sem tocar no registro institucional', async () => {
    const deps = buildUseCase();
    await deps.roleRepository.create(buildRole());
    await deps.userRepository.create(buildUser());
    await deps.memberRepository.create(buildMember());

    const personalEvent: PersonalEvent = {
      id: 'pe1',
      tenantId: 't1',
      userId: 'u1',
      titulo: 'Consulta médica',
      descricao: null,
      local: null,
      dataInicio: new Date('2026-06-10'),
      dataFim: new Date('2026-06-10'),
      lembreteMinutosAntes: null,
      sincronizarComGoogle: false,
      googleEventId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await deps.personalEventRepository.create(personalEvent);

    const personalTask: PersonalTask = {
      id: 'pt1',
      tenantId: 't1',
      userId: 'u1',
      titulo: 'Levar livro',
      concluida: false,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await deps.personalTaskRepository.create(personalTask);

    const personalNote: PersonalNote = {
      id: 'pn1',
      tenantId: 't1',
      userId: 'u1',
      texto: 'Lembrete pessoal',
      fixada: false,
      eventoOrigem: null,
      eventoId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await deps.personalNoteRepository.create(personalNote);

    const favorite: LibraryFavorite = {
      id: 'fav1',
      tenantId: 't1',
      userId: 'u1',
      libraryItemId: 'lib1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await deps.libraryFavoriteRepository.create(favorite);

    const connection: GoogleCalendarConnection = {
      id: 'conn1',
      tenantId: 't1',
      userId: 'u1',
      syncStatus: 'connected',
      googleAccountEmail: 'irmao@gmail.com',
      accessTokenEncrypted: 'enc',
      accessTokenExpiresAt: new Date('2026-06-02'),
      refreshTokenEncrypted: 'enc',
      scope: 'calendar',
      syncToken: null,
      calendarId: 'primary',
      lastSyncedAt: null,
      lastError: null,
      preferences: {
        exibirEventosGoogle: true,
        sincronizarVL6ParaGoogle: true,
        sincronizarPessoalParaGoogle: false,
        detectarConflitos: true,
      },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'u1',
      updatedBy: 'u1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await deps.googleCalendarConnectionRepository.create(connection);

    const result = await deps.useCase.execute(buildCtx());

    expect(result.ok).toBe(true);

    expect(await deps.userRepository.findById('u1')).toBeNull();

    const member = await deps.memberRepository.findById('m1');
    expect(member).not.toBeNull();
    expect(member?.userId).toBeNull();

    expect((await deps.personalEventRepository.findById('pe1'))?.deletedAt).toEqual(
      new Date('2026-06-01T00:00:00Z'),
    );
    expect((await deps.personalTaskRepository.findById('pt1'))?.deletedAt).toEqual(
      new Date('2026-06-01T00:00:00Z'),
    );
    expect((await deps.personalNoteRepository.findById('pn1'))?.deletedAt).toEqual(
      new Date('2026-06-01T00:00:00Z'),
    );

    const remainingFavorites = await deps.libraryFavoriteRepository.listByUser('t1', 'u1');
    expect(remainingFavorites).toHaveLength(0);

    expect(await deps.googleCalendarConnectionRepository.findByUserId('t1', 'u1')).toBeNull();

    const auditEntries = await deps.auditLogRepository.search(
      { tenantId: 't1', entidade: 'users' },
      { limit: 20 },
    );
    expect(
      auditEntries.items.some((entry) => entry.acao === 'delete' && entry.entidadeId === 'u1'),
    ).toBe(true);
  });
});
