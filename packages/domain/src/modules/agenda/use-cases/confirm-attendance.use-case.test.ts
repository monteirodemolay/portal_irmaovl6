import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { Member } from '../../membership/entities/member.entity';
import type { Event } from '../entities/event.entity';
import type { EventAttendance } from '../entities/event-attendance.entity';
import type { IEventAttendanceRepository } from '../repositories/event-attendance.repository';
import type { IEventRepository } from '../repositories/event.repository';
import { ConfirmAttendanceUseCase } from './confirm-attendance.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: ['event:read'] };

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2026-02-01T20:00:00Z'),
    dataFim: new Date('2026-02-01T22:00:00Z'),
    exigeConfirmacaoPresenca: true,
    capacidadeMaxima: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'u1',
    nomeCompleto: 'Fulano de Tal',
    fotoUrl: null,
    email: 'fulano@example.com',
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '001',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'regular',
    lojaId: 't1',
    potencia: 'GOB',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin',
    updatedBy: 'admin',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

class FakeEventRepository implements Partial<IEventRepository> {
  constructor(private readonly event: Event) {}
  async findById() {
    return this.event;
  }
}

class FakeMemberRepository implements Partial<IMemberRepository> {
  constructor(private readonly member: Member) {}
  async findByUserId() {
    return this.member;
  }
}

class FakeEventAttendanceRepository implements Partial<IEventAttendanceRepository> {
  confirmedCount = 0;
  created: EventAttendance | null = null;
  async findByEventAndMember() {
    return null;
  }
  async countConfirmedByEvent() {
    return this.confirmedCount;
  }
  async create(attendance: EventAttendance) {
    this.created = attendance;
  }
}

const clock: IClock = { now: () => new Date('2026-01-15T00:00:00Z') };
const idGenerator: IIdGenerator = { next: () => 'attendance-1' };

describe('ConfirmAttendanceUseCase', () => {
  it('rejeita quando o evento não exige confirmação de presença', async () => {
    const useCase = new ConfirmAttendanceUseCase({
      eventRepository: new FakeEventRepository(
        buildEvent({ exigeConfirmacaoPresenca: false }),
      ) as unknown as IEventRepository,
      attendanceRepository:
        new FakeEventAttendanceRepository() as unknown as IEventAttendanceRepository,
      memberRepository: new FakeMemberRepository(buildMember()) as unknown as IMemberRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, 'event-1', 'confirmado');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('confirma normalmente quando há vaga', async () => {
    const attendanceRepo = new FakeEventAttendanceRepository();
    const useCase = new ConfirmAttendanceUseCase({
      eventRepository: new FakeEventRepository(
        buildEvent({ capacidadeMaxima: 10 }),
      ) as unknown as IEventRepository,
      attendanceRepository: attendanceRepo as unknown as IEventAttendanceRepository,
      memberRepository: new FakeMemberRepository(buildMember()) as unknown as IMemberRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, 'event-1', 'confirmado');

    expect(result.ok).toBe(true);
    expect(attendanceRepo.created?.statusPresenca).toBe('confirmado');
  });

  it('entra como pendente (lista de espera) quando a capacidade máxima foi atingida', async () => {
    const attendanceRepo = new FakeEventAttendanceRepository();
    attendanceRepo.confirmedCount = 10;
    const useCase = new ConfirmAttendanceUseCase({
      eventRepository: new FakeEventRepository(
        buildEvent({ capacidadeMaxima: 10 }),
      ) as unknown as IEventRepository,
      attendanceRepository: attendanceRepo as unknown as IEventAttendanceRepository,
      memberRepository: new FakeMemberRepository(buildMember()) as unknown as IMemberRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, 'event-1', 'confirmado');

    expect(result.ok).toBe(true);
    expect(attendanceRepo.created?.statusPresenca).toBe('pendente');
  });

  it('permite recusar mesmo com capacidade máxima atingida', async () => {
    const attendanceRepo = new FakeEventAttendanceRepository();
    attendanceRepo.confirmedCount = 10;
    const useCase = new ConfirmAttendanceUseCase({
      eventRepository: new FakeEventRepository(
        buildEvent({ capacidadeMaxima: 10 }),
      ) as unknown as IEventRepository,
      attendanceRepository: attendanceRepo as unknown as IEventAttendanceRepository,
      memberRepository: new FakeMemberRepository(buildMember()) as unknown as IMemberRepository,
      clock,
      idGenerator,
    });

    const result = await useCase.execute(ctx, 'event-1', 'recusado');

    expect(result.ok).toBe(true);
    expect(attendanceRepo.created?.statusPresenca).toBe('recusado');
  });
});
