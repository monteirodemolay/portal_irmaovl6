import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryArchiveCollectionRepository,
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
  InMemoryArchiveRelationRepository,
  InMemoryBoardTermRepository,
  InMemoryEventRepository,
  InMemoryMemberRepository,
} from '../../../test/fakes';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { ArchiveMedia } from '../entities/archive-media.entity';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import type { Event } from '../../agenda/entities/event.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { Member } from '../../membership/entities/member.entity';
import { ExpandConstellationNodeUseCase } from './expand-constellation-node.use-case';

const ctx: AuthContext = {
  uid: 'u1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:read'],
};

const noPermCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r2', permissions: [] };

function buildItem(overrides: Partial<ArchiveItem> = {}): ArchiveItem {
  return {
    id: 'item-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    titulo: 'Sessão de Iniciação',
    tipo: 'fotografia',
    descricao: null,
    nivelAcesso: 'irmaos',
    publicacaoStatus: 'publicado',
    capaMediaId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: 'event-1',
    tenantId: 't1',
    tipo: 'sessao',
    titulo: 'Sessão Ordinária',
    descricao: null,
    local: 'Sede da Loja',
    dataInicio: new Date('2025-01-01T20:00:00Z'),
    dataFim: null,
    exigeConfirmacaoPresenca: false,
    capacidadeMaxima: null,
    traje: null,
    chegadaSugerida: null,
    observacoes: null,
    arquivosRelacionados: [],
    boardTermId: 'term-1',
    nivelAcesso: 'irmaos',
    exibirNaLinhaDoTempo: true,
    grau: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildBoardTerm(overrides: Partial<BoardTerm> = {}): BoardTerm {
  return {
    id: 'term-1',
    tenantId: 't1',
    nome: 'Gestão 2025/2026',
    periodoInicio: new Date('2025-01-01'),
    periodoFim: new Date('2025-12-31'),
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
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
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
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

function buildMedia(overrides: Partial<ArchiveMedia> = {}): ArchiveMedia {
  return {
    id: 'media-1',
    tenantId: 't1',
    eventId: 'event-1',
    boardTermId: 'term-1',
    archiveItemId: 'item-1',
    mediaAssetId: 'asset-1',
    mediaType: 'foto',
    documentType: null,
    role: null,
    order: 0,
    caption: null,
    altText: null,
    isCover: false,
    isFeatured: false,
    accessLevel: 'irmaos',
    allowDownload: false,
    publicacaoStatus: 'publicado',
    autor: null,
    tags: [],
    pessoasIdentificadas: [],
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildRelation(overrides: Partial<ArchiveRelation> = {}): ArchiveRelation {
  return {
    id: 'rel-1',
    tenantId: 't1',
    origemTipo: 'archiveItem',
    origemId: 'item-1',
    destinoTipo: 'member',
    destinoId: 'member-1',
    tipo: 'retrata',
    descricao: 'Confirmado pelo Secretário a partir da ata',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const archiveRelationRepository = new InMemoryArchiveRelationRepository();
  const archiveCollectionRepository = new InMemoryArchiveCollectionRepository();
  const memberRepository = new InMemoryMemberRepository();
  const eventRepository = new InMemoryEventRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new ExpandConstellationNodeUseCase({
    archiveItemRepository,
    archiveMediaRepository,
    archiveRelationRepository,
    archiveCollectionRepository,
    memberRepository,
    eventRepository,
    boardTermRepository,
  });
  return {
    useCase,
    archiveItemRepository,
    archiveMediaRepository,
    archiveRelationRepository,
    memberRepository,
    eventRepository,
    boardTermRepository,
  };
}

describe('ExpandConstellationNodeUseCase', () => {
  it('expande um archiveItem com evento, gestão e pessoa identificada (relações derivadas)', async () => {
    const {
      useCase,
      archiveItemRepository,
      eventRepository,
      boardTermRepository,
      memberRepository,
      archiveMediaRepository,
    } = buildUseCase();
    await archiveItemRepository.create(buildItem());
    await eventRepository.create(buildEvent());
    await boardTermRepository.create(buildBoardTerm());
    await memberRepository.create(buildMember());
    await archiveMediaRepository.create(buildMedia({ pessoasIdentificadas: ['member-1'] }));

    const result = await useCase.execute(ctx, { kind: 'archiveItem', id: 'item-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const kinds = result.value.nodes.map((n) => n.kind).sort();
    expect(kinds).toEqual(['boardTerm', 'event', 'member']);
    expect(result.value.edges.every((e) => e.source === 'derived')).toBe(true);
  });

  it('relação curated substitui a derivada equivalente', async () => {
    const {
      useCase,
      archiveItemRepository,
      memberRepository,
      archiveMediaRepository,
      archiveRelationRepository,
    } = buildUseCase();
    await archiveItemRepository.create(buildItem({ eventId: 'no-event', boardTermId: null }));
    await memberRepository.create(buildMember());
    await archiveMediaRepository.create(buildMedia({ pessoasIdentificadas: ['member-1'] }));
    await archiveRelationRepository.create(buildRelation());

    const result = await useCase.execute(ctx, { kind: 'archiveItem', id: 'item-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const memberEdge = result.value.edges.find((e) => e.targetKey === 'member:member-1');
    expect(memberEdge?.source).toBe('curated');
    expect(memberEdge?.relationLabel).toBe('Confirmado pelo Secretário a partir da ata');
  });

  it('grupo "member" pagina através do repositório de Irmãos', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'm1' }));
    await memberRepository.create(buildMember({ id: 'm2', nomeCompleto: 'Maria Souza' }));

    const result = await useCase.execute(ctx, { kind: 'group', id: 'member' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.nodes).toHaveLength(2);
    expect(result.value.nodes.every((n) => n.kind === 'member')).toBe(true);
  });

  it('item rascunho não aparece na expansão do evento', async () => {
    const { useCase, archiveItemRepository, eventRepository } = buildUseCase();
    await eventRepository.create(buildEvent());
    await archiveItemRepository.create(buildItem({ id: 'i1', publicacaoStatus: 'publicado' }));
    await archiveItemRepository.create(
      buildItem({ id: 'i2', publicacaoStatus: 'rascunho', boardTermId: null }),
    );

    const result = await useCase.execute(ctx, { kind: 'event', id: 'event-1' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const itemNodes = result.value.nodes.filter((n) => n.kind === 'archiveItem');
    expect(itemNodes.map((n) => n.id)).toEqual(['i1']);
  });

  it('lança ForbiddenError sem a permissão archiveRelation:read', async () => {
    const { useCase } = buildUseCase();
    await expect(useCase.execute(noPermCtx, { kind: 'group', id: 'member' })).rejects.toThrow(
      ForbiddenError,
    );
  });
});
