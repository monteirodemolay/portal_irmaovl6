import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryArchiveMediaRepository,
  InMemoryBoardTermRepository,
  InMemoryMediaAssetRepository,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberPositionHistoryRepository,
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
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
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
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
  const boardTermRepository = new InMemoryBoardTermRepository();
  const archiveMediaRepository = new InMemoryArchiveMediaRepository();
  const mediaAssetRepository = new InMemoryMediaAssetRepository();
  const useCase = new GetPublicMemberProfileUseCase({
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
    memberPositionHistoryRepository,
    boardTermRepository,
    archiveMediaRepository,
    mediaAssetRepository,
  });
  return {
    useCase,
    memberRepository,
    publicationSettingsRepository,
    memberPositionHistoryRepository,
    boardTermRepository,
    archiveMediaRepository,
    mediaAssetRepository,
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

  it('devolve null quando nunca publicou', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it('devolve null quando suspenso pela Administração (mesmo com profilePublished true)', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(
      buildSettings({ suspendedAt: new Date('2026-06-01'), suspendedBy: 'admin-1' }),
    );

    const result = await useCase.execute(ctx, 'member-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
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
});
