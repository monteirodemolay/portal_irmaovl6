import { describe, expect, it } from 'vitest';
import { MEMBER_SITUATION_STATUSES, type MemberSituationStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import {
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryCommitteeRepository,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import type { PublicationSettings } from '../entities/publication-settings.entity';
import { SearchDirectoryUseCase } from './search-directory.use-case';

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
    lojaId: 't1',
    potencia: 'GOB',
    profissao: 'Advogado',
    empresa: 'Carvalho & Advogados',
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: 'Anotação administrativa confidencial',
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

function buildProfile(overrides: Partial<MemberCentralProfile> = {}): MemberCentralProfile {
  return {
    id: 'profile-1',
    tenantId: 't1',
    memberId: 'member-1',
    apresentacao: null,
    interesses: null,
    cidadeExibicao: 'Rio Verde - GO',
    areaAtuacao: 'direito',
    areaAtuacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: ['Direito Civil'],
    servicos: ['Consultoria jurídica'],
    lojasVisitadas: null,
    interessesMaconicos: null,
    externalLinks: {
      whatsapp: null,
      instagram: null,
      facebook: null,
      linkedin: null,
      lattes: null,
      site: null,
    },
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
      apresentacao: false,
      informacoesPessoais: true,
      profissional: true,
      empresa: false,
      informacoesMaconicas: false,
      competencias: true,
      servicos: true,
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
  const boardTermRepository = new InMemoryBoardTermRepository();
  const boardPositionAssignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const committeeRepository = new InMemoryCommitteeRepository();
  const useCase = new SearchDirectoryUseCase({
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
    boardTermRepository,
    boardPositionAssignmentRepository,
    committeeRepository,
  });
  return {
    useCase,
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
    boardTermRepository,
    boardPositionAssignmentRepository,
    committeeRepository,
  };
}

describe('SearchDirectoryUseCase', () => {
  it('Irmão institucional sem nenhum perfil voluntário aparece no Diretório (institutional_only)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.profileState).toBe('institutional_only');
    expect(result.value.items[0]?.optional.profissional).toBeNull();
  });

  it('Irmão com perfil mas sem publicar aparece como draft', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.profileState).toBe('draft');
    expect(result.value.items[0]?.optional.profissional).toBeNull();
  });

  it('Irmão suspenso pela Administração continua aparecendo, sem o conteúdo voluntário', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(
      buildSettings({ suspendedAt: new Date('2026-02-01'), suspendedBy: 'admin-1' }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.profileState).toBe('suspended');
    expect(result.value.items[0]?.optional.profissional).toBeNull();
  });

  it.each(MEMBER_SITUATION_STATUSES)(
    'Irmão em situação "%s" aparece no Diretório com o rótulo correto',
    async (situacao: MemberSituationStatus) => {
      const { useCase, memberRepository } = buildUseCase();
      await memberRepository.create(buildMember({ situacao }));

      const result = await useCase.execute(ctx);

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.items).toHaveLength(1);
      expect(result.value.items[0]?.situacao).toBe(situacao);
    },
  );

  it('Irmão excluído (soft delete) NUNCA aparece', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ deletedAt: new Date('2026-01-15') }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
  });

  it('Irmão de outro tenant NUNCA aparece', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-2', tenantId: 't2' }));

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(0);
  });

  it('sem filtro de situação (padrão "Todos"), mostra Irmãos em qualquer situação', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1', situacao: 'ativo' }));
    await memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Outro', situacao: 'desligado' }),
    );
    await memberRepository.create(
      buildMember({ id: 'member-3', nomeCompleto: 'Terceiro', situacao: 'falecido' }),
    );

    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(3);
  });

  it('filtro de situação explícito restringe ao valor pedido', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1', situacao: 'ativo' }));
    await memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Outro', situacao: 'desligado' }),
    );

    const result = await useCase.execute(ctx, { situacao: 'desligado' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.memberId).toBe('member-2');
  });

  it('busca por nome encontra Irmão institutional_only', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ nomeCompleto: 'Fulano de Tal' }));

    const result = await useCase.execute(ctx, { termo: 'fulano' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
  });

  it('filtra por profissão só sobre conteúdo autorizado/publicado', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, { profissao: 'advogado' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
  });

  it('um campo oculto/não autorizado NUNCA produz match de busca', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    // Bloco profissional desligado — `profissao` não pode aparecer na busca,
    // mesmo com `member.profissao` preenchido no cadastro institucional.
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(
      buildSettings({ blocks: { ...buildSettings().blocks, profissional: false } }),
    );

    const porTermo = await useCase.execute(ctx, { termo: 'advogado' });
    expect(porTermo.ok && porTermo.value.items).toHaveLength(0);

    const porProfissao = await useCase.execute(ctx, { profissao: 'advogado' });
    expect(porProfissao.ok && porProfissao.value.items).toHaveLength(0);
  });

  it('filtra por área de atuação (chave exata)', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(buildSettings());

    const encontra = await useCase.execute(ctx, { areaAtuacao: 'direito' });
    expect(encontra.ok && encontra.value.items).toHaveLength(1);

    const naoEncontra = await useCase.execute(ctx, { areaAtuacao: 'engenharia' });
    expect(naoEncontra.ok && naoEncontra.value.items).toHaveLength(0);
  });

  it('filtra por competência exata (case-insensitive)', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx, { competencia: 'direito civil' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
  });

  it('filtra por grau', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-1', grau: 'aprendiz' }));
    await memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Outro', grau: 'mestre' }),
    );

    const result = await useCase.execute(ctx, { grau: 'aprendiz' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0]?.memberId).toBe('member-1');
  });

  it('resolve cargo e comissão institucionais da gestão vigente e permite buscar por eles', async () => {
    const {
      useCase,
      memberRepository,
      boardTermRepository,
      boardPositionAssignmentRepository,
      committeeRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await boardTermRepository.create({
      id: 'gestao-1',
      tenantId: 't1',
      periodoInicio: new Date('2026-01-01'),
      periodoFim: new Date('2027-12-31'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    } as never);
    await boardPositionAssignmentRepository.create({
      id: 'assign-1',
      tenantId: 't1',
      gestaoId: 'gestao-1',
      cargo: 'secretario',
      memberId: 'member-1',
      ordem: 0,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    } as never);
    await committeeRepository.create({
      id: 'com-1',
      tenantId: 't1',
      gestaoId: 'gestao-1',
      nome: 'Beneficência',
      descricao: null,
      membrosIds: ['member-1'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
      deletedAt: null,
      status: 'active',
      ativo: true,
    } as never);

    const result = await useCase.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items[0]?.cargoAtual).toBe('Secretário');
    expect(result.value.items[0]?.comissoes).toEqual([{ id: 'com-1', nome: 'Beneficência' }]);

    const porCargo = await useCase.execute(ctx, { cargo: 'Secretário' });
    expect(porCargo.ok && porCargo.value.items).toHaveLength(1);

    const porComissao = await useCase.execute(ctx, { comissao: 'Beneficência' });
    expect(porComissao.ok && porComissao.value.items).toHaveLength(1);
  });

  it('metrics e areaFacets refletem o total institucional, mesmo com filtro ativo', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(buildSettings());

    await memberRepository.create(
      buildMember({ id: 'member-2', nomeCompleto: 'Outro Irmão', profissao: 'Engenheiro' }),
    );
    await memberCentralProfileRepository.create(
      buildProfile({
        id: 'profile-2',
        memberId: 'member-2',
        areaAtuacao: 'engenharia',
        competencias: [],
      }),
    );
    await publicationSettingsRepository.create(
      buildSettings({ id: 'settings-2', memberId: 'member-2' }),
    );

    // Irmão institucional puro, sem perfil — entra em `totalIrmaos`, nunca em `areaFacets`.
    await memberRepository.create(buildMember({ id: 'member-3', nomeCompleto: 'Sem Perfil' }));

    const result = await useCase.execute(ctx, { areaAtuacao: 'direito' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.items).toHaveLength(1); // filtrado
    expect(result.value.metrics.totalIrmaos).toBe(3); // total institucional, não filtrado
    expect(result.value.areaFacets).toEqual(
      expect.arrayContaining([
        { key: 'direito', label: 'Direito', count: 1 },
        { key: 'engenharia', label: 'Engenharia', count: 1 },
      ]),
    );
  });

  it('CIM, observações administrativas, endereço e contatos nunca aparecem no DTO da listagem', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildUseCase();
    await memberRepository.create(
      buildMember({ cim: '12345', observacoes: 'confidencial', telefone: '(64) 99999-0000' }),
    );
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(
      buildSettings({ contacts: { telefone: true, whatsapp: true, email: true } }),
    );

    const result = await useCase.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const serialized = JSON.stringify(result.value.items);
    expect(serialized).not.toContain('12345');
    expect(serialized).not.toContain('confidencial');
    expect(serialized).not.toContain('99999-0000');
    expect(serialized.includes('"cim"')).toBe(false);
    expect(serialized.includes('"observacoes"')).toBe(false);
    expect(serialized.includes('"contatos"')).toBe(false);
    expect(serialized.includes('"endereco"')).toBe(false);
  });

  it('lança ForbiddenError sem memberDirectory:read', async () => {
    const { useCase } = buildUseCase();
    const ctxSemPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(ctxSemPermissao)).rejects.toThrow('Permissão ausente');
  });
});
