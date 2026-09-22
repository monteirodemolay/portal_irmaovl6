import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryBoardPositionAssignmentRepository,
  InMemoryBoardTermRepository,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  InMemoryPublicationSettingsRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../../central/entities/member-central-profile.entity';
import type { PublicationSettings } from '../../central/entities/publication-settings.entity';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { BoardPositionAssignment } from '../../governance/entities/board-position-assignment.entity';
import { ListParamasonicMemberDirectoryUseCase } from './list-paramasonic-member-directory.use-case';

const ctx: AuthContext = {
  uid: 'guest-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['paramasonicCommunity:read'],
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

function buildProfile(overrides: Partial<MemberCentralProfile> = {}): MemberCentralProfile {
  return {
    id: 'profile-1',
    tenantId: 't1',
    memberId: 'member-1',
    apresentacao: 'Apaixonado por Direito Civil e voluntariado.',
    interesses: null,
    cidadeExibicao: 'Rio Verde - GO',
    areaAtuacao: 'direito',
    areaAtuacaoOutra: null,
    especializacao: null,
    especializacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: [],
    servicos: [],
    afiliacoes: [],
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
      apresentacao: true,
      informacoesPessoais: true,
      profissional: true,
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

function buildBoardTerm(overrides: Partial<BoardTerm> = {}): BoardTerm {
  return {
    id: 'gestao-1',
    tenantId: 't1',
    nome: 'Gestão 2026',
    periodoInicio: new Date('2026-01-01'),
    periodoFim: new Date('2026-12-31'),
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

function buildAssignment(
  overrides: Partial<BoardPositionAssignment> = {},
): BoardPositionAssignment {
  return {
    id: 'assignment-1',
    tenantId: 't1',
    gestaoId: 'gestao-1',
    cargo: 'veneravel_mestre',
    memberId: 'member-1',
    ordem: 1,
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

function buildDeps() {
  const memberRepository = new InMemoryMemberRepository();
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const publicationSettingsRepository = new InMemoryPublicationSettingsRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const boardPositionAssignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const useCase = new ListParamasonicMemberDirectoryUseCase({
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
    boardTermRepository,
    boardPositionAssignmentRepository,
  });
  return {
    useCase,
    memberRepository,
    memberCentralProfileRepository,
    publicationSettingsRepository,
    boardTermRepository,
    boardPositionAssignmentRepository,
  };
}

describe('ListParamasonicMemberDirectoryUseCase', () => {
  it('lança ForbiddenError sem a permissão paramasonicCommunity:read', async () => {
    const { useCase } = buildDeps();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao)).rejects.toThrow(ForbiddenError);
  });

  it('traz um Irmão ativo sem PublicationSettings já com os blocos abertos (padrão publicado)', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    // `settings === null` (nunca configurou) é ABERTO por padrão — decisão
    // do Administrador (setembro/2026), não mais fechado/só identidade.
    expect(result[0]).toMatchObject({
      memberId: 'member-1',
      nomeCompleto: 'Irmão de Teste',
      cargoAtual: null,
      profissao: 'Advogado',
    });
  });

  it('esconde os blocos voluntários quando o Irmão desligou a publicação explicitamente', async () => {
    const { useCase, memberRepository, publicationSettingsRepository } = buildDeps();
    await memberRepository.create(buildMember());
    await publicationSettingsRepository.create(buildSettings({ profilePublished: false }));

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      memberId: 'member-1',
      apresentacao: null,
      profissao: null,
      areaAtuacao: null,
      cidadeExibicao: null,
    });
  });

  it('nunca inclui Irmão fora de situação ativo (falecido, desligado etc.)', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember({ situacao: 'falecido' }));

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(0);
  });

  it('só expõe apresentação/profissão/cidade quando o próprio bloco foi publicado', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildDeps();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(
      buildSettings({
        blocks: {
          apresentacao: false,
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
      }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      apresentacao: null,
      profissao: null,
      areaAtuacao: null,
      cidadeExibicao: null,
    });
  });

  it('expõe apresentação/profissão/área/cidade quando os blocos correspondentes estão publicados', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildDeps();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(buildSettings());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      apresentacao: 'Apaixonado por Direito Civil e voluntariado.',
      profissao: 'Advogado',
      cidadeExibicao: 'Rio Verde - GO',
    });
    expect(result[0]?.areaAtuacao).toBe('Direito');
  });

  it('nunca expõe nada quando o perfil não está publicado (profilePublished false)', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildDeps();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(buildSettings({ profilePublished: false }));

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ apresentacao: null, profissao: null, cidadeExibicao: null });
  });

  it('nunca expõe nada quando o perfil está suspenso pela Administração', async () => {
    const {
      useCase,
      memberRepository,
      memberCentralProfileRepository,
      publicationSettingsRepository,
    } = buildDeps();
    await memberRepository.create(buildMember());
    await memberCentralProfileRepository.create(buildProfile());
    await publicationSettingsRepository.create(
      buildSettings({ suspendedAt: new Date('2026-02-01'), suspendedBy: 'admin-1' }),
    );

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ apresentacao: null, profissao: null, cidadeExibicao: null });
  });

  it('resolve o cargo atual a partir da Gestão vigente', async () => {
    const { useCase, memberRepository, boardTermRepository, boardPositionAssignmentRepository } =
      buildDeps();
    await memberRepository.create(buildMember());
    await boardTermRepository.create(buildBoardTerm());
    await boardPositionAssignmentRepository.create(buildAssignment());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.cargoAtual).toBe('Venerável Mestre');
  });

  it('não atribui cargo a Irmão fora da Gestão vigente', async () => {
    const { useCase, memberRepository, boardTermRepository, boardPositionAssignmentRepository } =
      buildDeps();
    await memberRepository.create(buildMember());
    await memberRepository.create(buildMember({ id: 'member-2', nomeCompleto: 'Outro Irmão' }));
    await boardTermRepository.create(buildBoardTerm());
    await boardPositionAssignmentRepository.create(buildAssignment());

    const result = await useCase.execute(ctx);

    const outro = result.find((r) => r.memberId === 'member-2');
    expect(outro?.cargoAtual).toBeNull();
  });

  it('ordena o resultado alfabeticamente por nome (pt-BR)', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember({ id: 'member-2', nomeCompleto: 'Zeca Irmão' }));
    await memberRepository.create(buildMember({ id: 'member-1', nomeCompleto: 'Álvaro Irmão' }));

    const result = await useCase.execute(ctx);

    expect(result.map((r) => r.nomeCompleto)).toEqual(['Álvaro Irmão', 'Zeca Irmão']);
  });

  it('nunca vaza Irmãos de outro tenant', async () => {
    const { useCase, memberRepository } = buildDeps();
    await memberRepository.create(buildMember({ id: 'member-2', tenantId: 't2' }));
    await memberRepository.create(buildMember());

    const result = await useCase.execute(ctx);

    expect(result).toHaveLength(1);
    expect(result[0]?.memberId).toBe('member-1');
  });
});
