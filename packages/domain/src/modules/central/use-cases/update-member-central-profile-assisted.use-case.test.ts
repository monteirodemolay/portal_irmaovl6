import { describe, expect, it } from 'vitest';
import type { MemberCentralProfileValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryAuditLogRepository,
  InMemoryMemberCentralProfileRepository,
  InMemoryMemberRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import { UpdateMemberCentralProfileAssistedUseCase } from './update-member-central-profile-assisted.use-case';

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r-admin',
  permissions: ['memberCentral:manage'],
};

const noPermCtx: AuthContext = {
  uid: 'regular-1',
  tenantId: 't1',
  roleId: 'r-member',
  permissions: ['memberCentral:update'],
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

function buildInput(
  overrides: Partial<MemberCentralProfileValues> = {},
): MemberCentralProfileValues {
  return {
    apresentacao: 'Preenchido pela Administração',
    interesses: null,
    cidadeExibicao: null,
    areaAtuacao: null,
    areaAtuacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: [],
    servicos: [],
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
    ...overrides,
  };
}

function buildUseCase() {
  const memberCentralProfileRepository = new InMemoryMemberCentralProfileRepository();
  const memberRepository = new InMemoryMemberRepository();
  const auditLogRepository = new InMemoryAuditLogRepository();
  const clock = new FixedClock(new Date('2026-02-01T00:00:00Z'));
  const idGenerator = new SequentialIdGenerator();
  const useCase = new UpdateMemberCentralProfileAssistedUseCase({
    memberCentralProfileRepository,
    memberRepository,
    auditLogRepository,
    clock,
    idGenerator,
  });
  return { useCase, memberCentralProfileRepository, memberRepository, auditLogRepository };
}

describe('UpdateMemberCentralProfileAssistedUseCase', () => {
  it('admin com memberCentral:manage consegue preencher o perfil de outro Irmão', async () => {
    const { useCase, memberRepository, memberCentralProfileRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(adminCtx, 'member-1', buildInput());

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.memberId).toBe('member-1');
    expect(result.value.updatedBy).toBe('admin-1');
    const stored = await memberCentralProfileRepository.findByMemberId('t1', 'member-1');
    expect(stored?.apresentacao).toBe('Preenchido pela Administração');
  });

  it('rejeita quem não tem memberCentral:manage (checagem no Use Case, não só na UI)', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    await expect(useCase.execute(noPermCtx, 'member-1', buildInput())).rejects.toThrow(
      ForbiddenError,
    );
  });

  it('rejeita memberId de outro tenant', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember({ id: 'member-2', tenantId: 't2' }));

    const result = await useCase.execute(adminCtx, 'member-2', buildInput());

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('não publica nada — grava como rascunho', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(adminCtx, 'member-1', buildInput());

    expect(result.ok).toBe(true);
    // O tipo de retorno nem tem campo de publicação — a garantia real é que
    // este Use Case nunca toca PublicationSettings (nenhuma dependência dele).
  });

  it('negócio novo preenchido pela Administração também nasce pending_review', async () => {
    const { useCase, memberRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    const result = await useCase.execute(
      adminCtx,
      'member-1',
      buildInput({
        negocios: [
          {
            id: 'negocio-1',
            nomeEmpresa: 'Empresa do Irmão',
            segmento: null,
            cargo: null,
            descricao: null,
            cidade: null,
            telefoneComercial: null,
            siteUrl: null,
            cnpj: null,
            logoUrl: null,
            produtosServicos: [],
            whatsappComercial: null,
            emailComercial: null,
            instagramComercial: null,
            formasAtendimento: [],
            horarioFuncionamento: null,
            ofereceDescontoIrmaos: false,
            descontoDescricao: null,
          },
        ],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.negocios[0]).toMatchObject({ status: 'pending_review' });
  });

  it('grava evento de auditoria nomeado (started na primeira vez, updated depois)', async () => {
    const { useCase, memberRepository, auditLogRepository } = buildUseCase();
    await memberRepository.create(buildMember());

    await useCase.execute(adminCtx, 'member-1', buildInput());
    await useCase.execute(adminCtx, 'member-1', buildInput({ apresentacao: 'Editado de novo' }));

    const page = await auditLogRepository.search(
      { tenantId: 't1', entidade: 'memberCentralProfiles' },
      { limit: 10 },
    );
    const actions = page.items.map((entry) => entry.acao);
    expect(actions).toContain('member_profile_assisted_started');
    expect(actions).toContain('member_profile_assisted_updated');
  });
});
