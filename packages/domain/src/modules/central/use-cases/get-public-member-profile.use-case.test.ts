import { describe, expect, it } from 'vitest';
import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryArchiveItemRepository,
  InMemoryArchiveMediaRepository,
  InMemoryBoardTermRepository,
  InMemoryCommitteeRepository,
  InMemoryEventRepository,
  InMemoryFamilyPersonRepository,
  InMemoryFamilyRelationshipRepository,
  InMemoryMediaAssetRepository,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
  InMemoryMemberSituationRecordRepository,
  InMemoryPersonFraternalRecordRepository,
  InMemoryPublicationSettingsRepository,
  InMemoryTenantRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { GetPublicMemberProfileUseCase } from './get-public-member-profile.use-case';

const ctx: AuthContext = {
  uid: 'viewer-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['memberDirectory:read'],
};

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'user-1',
    nomeCompleto: 'Irmão de Teste',
    fotoUrl: null,
    email: 'irmao@vl6.test',
    telefone: '11999999999',
    whatsapp: '11999999999',
    endereco: null,
    dataNascimento: null,
    dataIniciacao: null,
    dataElevacao: null,
    dataExaltacao: null,
    cim: null,
    grau: 'mestre',
    cargoAtualId: null,
    situacao: 'ativo',
    lojaId: 't1',
    potencia: 'GOB',
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
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildSettings(overrides: Partial<PublicationSettings> = {}): PublicationSettings {
  return {
    id: 'settings-1',
    tenantId: 't1',
    memberId: 'member-1',
    profilePublished: true,
    blocks: {
      apresentacao: true,
      informacoesPessoais: false,
      profissional: false,
      empresa: false,
      informacoesMaconicas: false,
      competencias: false,
      servicos: false,
      afiliacoes: false,
      endereco: false,
      memoriaFotografica: false,
    },
    contacts: { telefone: false, whatsapp: false, email: false },
    externalLinks: {
      whatsapp: false,
      instagram: false,
      facebook: false,
      linkedin: false,
      lattes: false,
      site: false,
    },
    suspendedAt: null,
    suspendedBy: null,
    suspendedReason: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const memberPositionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const memberSituationRecordRepository = new InMemoryMemberSituationRecordRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const committeeRepository = new InMemoryCommitteeRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const archiveItemRepository = new InMemoryArchiveItemRepository();
  const eventRepository = new InMemoryEventRepository();
  const familyRelationshipRepository = new InMemoryFamilyRelationshipRepository();
  const familyPersonRepository = new InMemoryFamilyPersonRepository();
  const personFraternalRecordRepository = new InMemoryPersonFraternalRecordRepository();
  const tenantRepository = new InMemoryTenantRepository();
  const useCase = new GetPublicMemberProfileUseCase({
    memberRepository,
    tenantRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
    memberPositionHistoryRepository,
    memberSituationRecordRepository,
    boardTermRepository,
    committeeRepository,
    archiveMediaRepository,
    mediaAssetRepository,
    archiveItemRepository,
    eventRepository,
    familyRelationshipRepository,
    familyPersonRepository,
    personFraternalRecordRepository,
  });
  return {
    useCase,
    memberRepository,
    tenantRepository,
    publicationSettingsRepository,
    memberPositionHistoryRepository,
    memberSituationRecordRepository,
    boardTermRepository,
    committeeRepository,
    archiveMediaRepository,
    mediaAssetRepository,
    archiveItemRepository,
    eventRepository,
    familyRelationshipRepository,
    familyPersonRepository,
    personFraternalRecordRepository,
  };
}

describe('GetPublicMemberProfileUseCase', () => {
  it('devolve o DTO filtrado quando publicado', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.nomeCompleto).toBe('Irmão de Teste');
    expect(result.value?.apresentacao).not.toBeNull();
    expect(result.value?.profissional).toBeNull(); // bloco desligado — chave inteira null
    expect(result.value?.contatos).toBeNull(); // nenhum contato autorizado
    expect(result.value?.trajetoria).not.toBeNull(); // trajetória não passa pelos blocos
  });

  it('traz a trajetória institucional independente dos blocos de publicação', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      memberPositionHistoryRepository,
      boardTermRepository,
    } = buildUseCase();
    await memberRepository.create(
      buildMember({ dataIniciacao: new Date('2020-03-01'), dataElevacao: new Date('2022-03-01') }),
    );
    await publicationSettingsRepository.create(buildSettings());
    await boardTermRepository.create({
      id: 'gestao-1',
      tenantId: 't1',
      nome: 'Gestão 2024/2025',
      periodoInicio: new Date('2024-06-01'),
      periodoFim: new Date('2025-06-01'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await memberPositionHistoryRepository.create({
      id: 'history-1',
      tenantId: 't1',
      memberId: 'member-1',
      cargo: 'secretario',
      gestaoId: 'gestao-1',
      dataInicio: new Date('2024-06-01'),
      dataFim: null,
      observacoes: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.trajetoria?.dataIniciacao).toEqual(new Date('2020-03-01'));
    expect(result.value?.trajetoria?.cargos).toHaveLength(1);
    expect(result.value?.trajetoria?.cargos[0]).toMatchObject({
      cargo: 'secretario',
      gestaoNome: 'Gestão 2024/2025',
    });
  });

  it('traz comissões na trajetória institucional, com o período herdado da gestão', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      boardTermRepository,
      committeeRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());
    await boardTermRepository.create({
      id: 'gestao-1',
      tenantId: 't1',
      nome: 'Gestão 2024/2025',
      periodoInicio: new Date('2024-06-01'),
      periodoFim: new Date('2025-06-01'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await committeeRepository.create({
      id: 'comissao-1',
      tenantId: 't1',
      gestaoId: 'gestao-1',
      nome: 'Comissão de Beneficência',
      descricao: null,
      membrosIds: ['member-1'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.trajetoria?.comissoes).toHaveLength(1);
    expect(result.value?.trajetoria?.comissoes[0]).toMatchObject({
      nome: 'Comissão de Beneficência',
      gestaoNome: 'Gestão 2024/2025',
      dataInicio: new Date('2024-06-01'),
      dataFim: new Date('2025-06-01'),
    });
  });

  it('traz a memória fotográfica só quando o bloco memoriaFotografica está ligado', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      archiveMediaRepository,
      mediaAssetRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(
      buildSettings({ blocks: { ...buildSettings().blocks, memoriaFotografica: true } }),
    );
    await mediaAssetRepository.create({
      id: 'asset-1',
      tenantId: 't1',
      originalName: 'foto.jpg',
      normalizedName: 'foto.jpg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      size: 1000,
      sha256: 'abc',
      provider: 'vercel_blob',
      storageKey: 'foto.jpg',
      processingStatus: 'concluido',
      width: 800,
      height: 600,
      duration: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await mediaAssetRepository.create({
      id: 'asset-restrito',
      tenantId: 't1',
      originalName: 'restrito.jpg',
      normalizedName: 'restrito.jpg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      size: 1000,
      sha256: 'def',
      provider: 'vercel_blob',
      storageKey: 'restrito.jpg',
      processingStatus: 'concluido',
      width: 800,
      height: 600,
      duration: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    const baseMedia = {
      tenantId: 't1',
      boardTermId: null,
      archiveItemId: 'item-1',
      mediaType: 'foto' as const,
      documentType: null,
      role: null,
      order: 0,
      caption: null,
      altText: null,
      isCover: false,
      isFeatured: false,
      allowDownload: true,
      autor: null,
      tags: [],
      pessoasIdentificadas: ['member-1'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active' as const,
      ativo: true,
    };
    await archiveMediaRepository.create({
      ...baseMedia,
      id: 'media-1',
      eventId: 'event-1',
      mediaAssetId: 'asset-1',
      accessLevel: 'publico',
      publicacaoStatus: 'publicado',
    });
    // Nível "administracao" nunca aparece no Diretório, mesmo com o bloco ligado.
    await archiveMediaRepository.create({
      ...baseMedia,
      id: 'media-restrito',
      eventId: 'event-1',
      mediaAssetId: 'asset-restrito',
      accessLevel: 'administracao',
      publicacaoStatus: 'publicado',
    });

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.memoriaFotografica).toHaveLength(1);
    expect(result.value?.memoriaFotografica?.[0]).toMatchObject({ id: 'media-1' });
  });

  it('não traz memória fotográfica quando o bloco memoriaFotografica está desligado', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.memoriaFotografica).toBeNull();
  });

  it('nunca devolve null pra Irmão institucional sem perfil — abre com os blocos voluntários fechados', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toBeNull();
    expect(result.value?.memberId).toBe('member-1');
    expect(result.value?.profissional).toBeNull();
    expect(result.value?.apresentacao).toBeNull();
    expect(result.value?.contatos).toBeNull();
  });

  it('nunca devolve null quando suspenso pela Administração — mesma ficha institucional, sem o conteúdo voluntário', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(
      buildSettings({ suspendedAt: new Date('2026-06-01'), suspendedBy: 'admin-1' }),
    );

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toBeNull();
    expect(result.value?.profissional).toBeNull();
  });

  it('devolve null pra membro de outro tenant (isolamento multi-tenant)', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember({ tenantId: 't2' }));
    await publicationSettingsRepository.create(buildSettings({ tenantId: 't2' }));

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('traz o encerramento da trajetória pra Irmão falecido, a partir do registro vigente', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      memberSituationRecordRepository,
    } = buildUseCase();
    await memberRepository.create(
      buildMember({ situacao: 'falecido', dataFalecimento: new Date('2023-06-15') }),
    );
    await publicationSettingsRepository.create(buildSettings());
    await memberSituationRecordRepository.create({
      id: 'rec-1',
      tenantId: 't1',
      memberId: 'member-1',
      situacao: 'falecido',
      motivo: 'passou_ao_oriente_eterno',
      motivoOutroDescricao: null,
      dataInicio: new Date('2023-06-15'),
      dataFim: null,
      lojaId: 't1',
      potencia: 'GOB',
      documentoNumero: null,
      documentoData: null,
      observacoes: null,
      anexos: [],
      vigente: true,
      dataInicioEstimada: false,
      justificativaEdicaoRetroativa: null,
      origem: null,
      sourceCode: null,
      sourceLabel: null,
      recordKind: null,
      lojaOrigemId: null,
      lojaDestinoId: null,
      importBatchId: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.trajetoria?.encerramento).toEqual({
      situacao: 'falecido',
      motivo: 'passou_ao_oriente_eterno',
      motivoOutroDescricao: null,
      dataInicio: new Date('2023-06-15'),
    });
  });

  it('nunca traz encerramento pra Irmão ativo', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember({ situacao: 'ativo' }));
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.trajetoria?.encerramento).toBeNull();
  });

  it('nunca traz encerramento quando não há registro vigente correspondente', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({ situacao: 'falecido', dataFalecimento: new Date('2023-06-15') }),
    );
    await publicationSettingsRepository.create(buildSettings());
    // sem criar o MemberSituationRecord correspondente

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.trajetoria?.encerramento).toBeNull();
  });

  it('traz cônjuge e filhos mesmo quando o bloco informacoesPessoais está desligado — registro institucional, não passa pelas configurações de publicação', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(
      buildMember({
        conjugeNome: 'Maria de Teste',
        conjugeAniversarioDia: 20,
        conjugeAniversarioMes: 9,
        filhos: [{ id: 'filho-1', nome: 'João Filho', aniversarioDia: 5, aniversarioMes: 3 }],
      }),
    );
    await publicationSettingsRepository.create(
      buildSettings({ blocks: { ...buildSettings().blocks, informacoesPessoais: false } }),
    );

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.informacoesPessoais).toBeNull(); // bloco continua fechado pro resto
    expect(result.value?.conjuge).toMatchObject({
      nome: 'Maria de Teste',
      diaNascimento: 20,
      mesNascimento: 9,
    });
    expect(result.value?.filhos).toHaveLength(1);
    expect(result.value?.filhos[0]).toMatchObject({ nome: 'João Filho' });
  });

  it('cruza cônjuge/filhos com Família e Legado e traz o rótulo da afiliação paramaçônica quando o nome bate com um único FamilyPerson gerenciado pelo Irmão', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      familyPersonRepository,
      personFraternalRecordRepository,
    } = buildUseCase();
    await memberRepository.create(
      buildMember({
        conjugeNome: 'Maria de Teste',
        filhos: [{ id: 'filho-1', nome: 'Ana Filha', aniversarioDia: 5, aniversarioMes: 3 }],
      }),
    );
    await publicationSettingsRepository.create(buildSettings());
    await familyPersonRepository.create({
      id: 'esposa-1',
      tenantId: 't1',
      linkedMemberId: null,
      nomeCompleto: 'Maria de Teste',
      nomeBusca: normalizeNameForSearch('Maria de Teste'),
      fotoUrl: null,
      dataNascimento: null,
      dataFalecimento: null,
      lifeStatus: 'living',
      cidade: null,
      estado: null,
      pais: null,
      biografia: null,
      menorDeIdade: false,
      fraternalLinkStatus: 'has_affiliation',
      visibility: 'members',
      reviewStatus: 'draft',
      sourceKind: 'self_declaration',
      sourceDescription: null,
      managedByMemberId: 'member-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await familyPersonRepository.create({
      id: 'filha-1',
      tenantId: 't1',
      linkedMemberId: null,
      nomeCompleto: 'Ana Filha',
      nomeBusca: normalizeNameForSearch('Ana Filha'),
      fotoUrl: null,
      dataNascimento: null,
      dataFalecimento: null,
      lifeStatus: 'living',
      cidade: null,
      estado: null,
      pais: null,
      biografia: null,
      menorDeIdade: true,
      fraternalLinkStatus: 'has_affiliation',
      visibility: 'members',
      reviewStatus: 'draft',
      sourceKind: 'self_declaration',
      sourceDescription: null,
      managedByMemberId: 'member-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await personFraternalRecordRepository.create({
      id: 'record-esposa',
      tenantId: 't1',
      personKind: 'familyPerson',
      personId: 'esposa-1',
      affiliationKind: 'eastern_star',
      organizacaoNome: null,
      unidadeTipo: 'chapter',
      unidadeNome: null,
      unidadeNumero: null,
      cidade: null,
      estado: null,
      pais: null,
      potencia: null,
      rito: null,
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
      grau: null,
      cargos: [],
      titulos: [],
      passouAoOrienteEternoEm: null,
      resumoLegado: null,
      visibility: 'members',
      reviewStatus: 'draft',
      sourceKind: 'self_declaration',
      sourceDescription: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });
    await personFraternalRecordRepository.create({
      id: 'record-filha',
      tenantId: 't1',
      personKind: 'familyPerson',
      personId: 'filha-1',
      affiliationKind: 'jobs_daughters',
      organizacaoNome: null,
      unidadeTipo: 'bethel',
      unidadeNome: null,
      unidadeNumero: null,
      cidade: null,
      estado: null,
      pais: null,
      potencia: null,
      rito: null,
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
      grau: null,
      cargos: [],
      titulos: [],
      passouAoOrienteEternoEm: null,
      resumoLegado: null,
      visibility: 'members',
      reviewStatus: 'draft',
      sourceKind: 'self_declaration',
      sourceDescription: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.conjuge?.afiliacaoParamaconica).toBe('Ordem da Estrela do Oriente');
    expect(result.value?.filhos[0]?.afiliacaoParamaconica).toBe(
      'Ordem Internacional das Filhas de Jó',
    );
  });

  it('não cruza afiliação paramaçônica quando o nome bate com mais de um FamilyPerson gerenciado pelo Irmão (nome ambíguo)', async () => {
    const {
      useCase,
      memberRepository,
      publicationSettingsRepository,
      familyPersonRepository,
      personFraternalRecordRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember({ conjugeNome: 'Maria de Teste' }));
    await publicationSettingsRepository.create(buildSettings());
    const baseFamilyPerson = {
      tenantId: 't1',
      linkedMemberId: null,
      nomeCompleto: 'Maria de Teste',
      nomeBusca: normalizeNameForSearch('Maria de Teste'),
      fotoUrl: null,
      dataNascimento: null,
      dataFalecimento: null,
      lifeStatus: 'living' as const,
      cidade: null,
      estado: null,
      pais: null,
      biografia: null,
      menorDeIdade: false,
      fraternalLinkStatus: 'has_affiliation' as const,
      visibility: 'members' as const,
      reviewStatus: 'draft' as const,
      sourceKind: 'self_declaration' as const,
      sourceDescription: null,
      managedByMemberId: 'member-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active' as const,
      ativo: true,
    };
    await familyPersonRepository.create({ ...baseFamilyPerson, id: 'esposa-1' });
    await familyPersonRepository.create({ ...baseFamilyPerson, id: 'esposa-2' });
    await personFraternalRecordRepository.create({
      id: 'record-esposa',
      tenantId: 't1',
      personKind: 'familyPerson',
      personId: 'esposa-1',
      affiliationKind: 'eastern_star',
      organizacaoNome: null,
      unidadeTipo: 'chapter',
      unidadeNome: null,
      unidadeNumero: null,
      cidade: null,
      estado: null,
      pais: null,
      potencia: null,
      rito: null,
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
      grau: null,
      cargos: [],
      titulos: [],
      passouAoOrienteEternoEm: null,
      resumoLegado: null,
      visibility: 'members',
      reviewStatus: 'draft',
      sourceKind: 'self_declaration',
      sourceDescription: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'member-1',
      updatedBy: 'member-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    });

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.conjuge?.afiliacaoParamaconica).toBeNull();
  });
});
