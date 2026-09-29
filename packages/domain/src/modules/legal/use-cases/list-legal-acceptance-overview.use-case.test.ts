import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  InMemoryLegalDocumentAcceptanceRepository,
  InMemoryLegalDocumentVersionRepository,
  InMemoryMemberRepository,
  InMemoryUserRepository,
} from '../../../test/fakes';
import type { Member } from '../../membership/entities/member.entity';
import type { User } from '../../identity-access/entities/user.entity';
import type { LegalDocumentAcceptance } from '../entities/legal-document-acceptance.entity';
import type { LegalDocumentVersion } from '../entities/legal-document-version.entity';
import { ListLegalAcceptanceOverviewUseCase } from './list-legal-acceptance-overview.use-case';

const adminCtx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r-admin',
  permissions: ['legalDocument:manage'],
};
const noPermCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r-membro',
  permissions: ['legalDocument:read'],
};

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    tenantId: 't1',
    email: 'fulano@vl6.org.br',
    memberId: null,
    roleId: 'role-1',
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
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

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: 'user-1',
    nomeCompleto: 'Irmão Fulano',
    fotoUrl: null,
    email: 'fulano@vl6.org.br',
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
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    filhos: [],
    biografia: null,
    redesSociais: { instagram: null, facebook: null, linkedin: null },
    observacoes: null,
    autorizaDivulgacaoExterna: false,
    dataFalecimento: null,
    mensagemHomenagem: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildVersion(overrides: Partial<LegalDocumentVersion> = {}): LegalDocumentVersion {
  return {
    id: 'v-1',
    tenantId: 't1',
    documento: 'termos_uso',
    versao: '1.0.0',
    classificacao: 'mudanca_institucional',
    motivo: 'Publicação inicial.',
    impacto: 'alto',
    itensAlterados: [],
    exigeNovoAceite: true,
    conteudoMarkdown: 'conteúdo',
    diffResumo: null,
    autor: 'admin-1',
    responsavel: 'Diretoria VL6',
    publicadoEm: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function buildAcceptance(
  overrides: Partial<LegalDocumentAcceptance> = {},
): LegalDocumentAcceptance {
  return {
    id: 'a-1',
    tenantId: 't1',
    userId: 'user-1',
    documento: 'termos_uso',
    versaoAceita: '1.0.0',
    aceitoEm: new Date('2026-01-02T00:00:00Z'),
    ip: '203.0.113.1',
    userAgent: 'Mozilla/5.0',
    hashVersao: 'hash',
    origem: 'self_service',
    ...overrides,
  };
}

function buildUseCase() {
  const legalDocumentVersionRepository = new InMemoryLegalDocumentVersionRepository();
  const legalDocumentAcceptanceRepository = new InMemoryLegalDocumentAcceptanceRepository();
  const userRepository = new InMemoryUserRepository();
  const memberRepository = new InMemoryMemberRepository();
  const useCase = new ListLegalAcceptanceOverviewUseCase({
    legalDocumentVersionRepository,
    legalDocumentAcceptanceRepository,
    userRepository,
    memberRepository,
  });
  return {
    useCase,
    legalDocumentVersionRepository,
    legalDocumentAcceptanceRepository,
    userRepository,
    memberRepository,
  };
}

describe('ListLegalAcceptanceOverviewUseCase', () => {
  it('rejeita quem não tem legalDocument:manage', async () => {
    const { useCase } = buildUseCase();
    await expect(useCase.execute(noPermCtx)).rejects.toThrow(ForbiddenError);
  });

  it('lista um usuário pendente e um em dia, com o nome resolvido pelo Member', async () => {
    const {
      useCase,
      legalDocumentVersionRepository,
      legalDocumentAcceptanceRepository,
      userRepository,
      memberRepository,
    } = buildUseCase();

    await legalDocumentVersionRepository.append(buildVersion({ documento: 'termos_uso' }));
    await legalDocumentVersionRepository.append(
      buildVersion({ id: 'v-2', documento: 'politica_privacidade' }),
    );

    await userRepository.create(buildUser({ id: 'user-1', email: 'em-dia@vl6.org.br' }));
    await memberRepository.create(
      buildMember({ id: 'member-1', userId: 'user-1', nomeCompleto: 'Irmão Em Dia' }),
    );
    await legalDocumentAcceptanceRepository.append(
      buildAcceptance({ userId: 'user-1', documento: 'termos_uso' }),
    );
    await legalDocumentAcceptanceRepository.append(
      buildAcceptance({ id: 'a-2', userId: 'user-1', documento: 'politica_privacidade' }),
    );

    await userRepository.create(
      buildUser({ id: 'user-2', email: 'pendente@vl6.org.br', memberId: 'member-2' }),
    );
    await memberRepository.create(
      buildMember({ id: 'member-2', userId: 'user-2', nomeCompleto: 'Irmão Pendente' }),
    );

    const result = await useCase.execute(adminCtx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);

    const emDia = result.value.find((r) => r.userId === 'user-1');
    expect(emDia?.nomeCompleto).toBe('Irmão Em Dia');
    expect(emDia?.porDocumento.termos_uso.pendente).toBe(false);
    expect(emDia?.porDocumento.politica_privacidade.pendente).toBe(false);

    const pendente = result.value.find((r) => r.userId === 'user-2');
    expect(pendente?.nomeCompleto).toBe('Irmão Pendente');
    expect(pendente?.porDocumento.termos_uso.pendente).toBe(true);
    expect(pendente?.porDocumento.termos_uso.versaoAceita).toBeNull();
  });
});
