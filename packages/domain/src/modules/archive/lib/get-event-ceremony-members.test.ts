import { describe, expect, it, vi } from 'vitest';
import {
  InMemoryArchiveItemRepository,
  InMemoryEventRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { Event } from '../../agenda/entities/event.entity';
import type { Member } from '../../membership/entities/member.entity';
import { getEventCeremonyMembers } from './get-event-ceremony-members';

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2020-03-10T20:00:00Z'),
    dataFim: null,
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: null,
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    grau: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: null,
    titulo: 'Iniciação — 10/03/2020',
    tipo: 'outro',
    descricao: null,
    nivelAcesso: 'irmaos',
    publicacaoStatus: 'rascunho',
    capaMediaId: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
    nomeCompleto: 'João da Silva',
    fotoUrl: null,
    email: null,
    telefone: null,
    whatsapp: null,
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: '123',
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 't1',
    potencia: 'GLEG',
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    dataFalecimento: null,
    mensagemHomenagem: null,
    createdAt: new Date('2020-01-01'),
    updatedAt: new Date('2020-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

async function setup() {
  const deps = {
    archiveItemRepository: new InMemoryArchiveItemRepository(),
    eventRepository: new InMemoryEventRepository(),
    memberRepository: new InMemoryMemberRepository(),
  };
  const event = buildEvent({ dataInicio: new Date('2018-09-29'), sessionNature: 'iniciacao' });
  await deps.eventRepository.create(event);
  await deps.archiveItemRepository.create(buildItem({ origemIniciacaoMemberIds: ['a'] }));
  for (const [id, nomeCompleto] of [
    ['a', 'Aldo'],
    ['v', 'Vailtom'],
    ['r', 'Rafael'],
    ['j', 'Vanderlan'],
  ]) {
    await deps.memberRepository.create(
      buildMember({ id, nomeCompleto, dataIniciacao: new Date('2018-09-29') }),
    );
  }
  return { deps, event };
}

describe('getEventCeremonyMembers', () => {
  it('reúne os quatro iniciados quando somente Aldo tem vínculo no Acervo', async () => {
    const { deps, event } = await setup();
    await deps.memberRepository.create(
      buildMember({ id: 'birthday', dataNascimento: new Date('2018-09-29') }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'other-year', dataIniciacao: new Date('2019-09-29') }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'elevated', dataElevacao: new Date('2018-09-29') }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'deleted', dataIniciacao: new Date('2018-09-29'), deletedAt: new Date() }),
    );
    await deps.memberRepository.create(
      buildMember({ id: 'foreign', tenantId: 'other', dataIniciacao: new Date('2018-09-29') }),
    );
    const groups = await getEventCeremonyMembers(deps, event);
    expect(groups[0]!.membros.map((m) => m.id)).toEqual(['a', 'r', 'v', 'j']);
    expect(groups).toHaveLength(1);
    expect(
      (await deps.archiveItemRepository.findByEventId(event.id))[0]!.origemIniciacaoMemberIds,
    ).toEqual(['a']);
  });

  it('reflete a data corrigida sem conservar o vínculo antigo', async () => {
    const { deps, event } = await setup();
    const member = (await deps.memberRepository.findById('a'))!;
    await deps.memberRepository.update({ ...member, dataIniciacao: new Date('2017-09-29') });
    expect((await getEventCeremonyMembers(deps, event))[0]!.membros.map((m) => m.id)).not.toContain(
      'a',
    );
  });

  it('não presume participantes quando duas sessões da mesma natureza coincidem', async () => {
    const { deps, event } = await setup();
    await deps.eventRepository.create({ ...event, id: 'second' });
    expect((await getEventCeremonyMembers(deps, event))[0]!.membros.map((m) => m.id)).toEqual([
      'a',
    ]);
  });

  it.each(['elevacao', 'exaltacao'] as const)(
    'resolve %s sem exigir mídias ou vínculo prévio',
    async (tipo) => {
      const { deps, event } = await setup();
      const other = { ...event, id: 'ceremony', sessionNature: tipo };
      await deps.eventRepository.create(other);
      await deps.memberRepository.create(
        buildMember({
          id: 'new',
          [tipo === 'elevacao' ? 'dataElevacao' : 'dataExaltacao']: event.dataInicio,
        }),
      );
      const groups = await getEventCeremonyMembers(deps, other);
      expect(groups.map((g) => [g.tipo, g.membros.map((m) => m.id)])).toEqual([[tipo, ['new']]]);
    },
  );

  it('consulta todas as páginas e não duplica participantes', async () => {
    const { deps, event } = await setup();
    const a = (await deps.memberRepository.findById('a'))!;
    const r = (await deps.memberRepository.findById('r'))!;
    const search = vi
      .spyOn(deps.memberRepository, 'search')
      .mockResolvedValueOnce({ items: [a], hasMore: true, nextCursor: 'next' })
      .mockResolvedValueOnce({ items: [a, r], hasMore: false, nextCursor: null });
    expect((await getEventCeremonyMembers(deps, event))[0]!.membros.map((m) => m.id)).toEqual([
      'a',
      'r',
    ]);
    expect(search).toHaveBeenLastCalledWith({ tenantId: 't1' }, { limit: 100, cursor: 'next' });
  });

  it('não associa datas a eventos comuns sem cerimônia', async () => {
    const { deps, event } = await setup();
    expect(
      await getEventCeremonyMembers(deps, {
        ...event,
        id: 'birthday',
        tipo: 'aniversario',
        sessionNature: null,
      }),
    ).toEqual([]);
  });
});
