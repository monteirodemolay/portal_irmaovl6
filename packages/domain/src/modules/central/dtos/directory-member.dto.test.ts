import { describe, expect, it } from 'vitest';
import type { Member } from '../../membership/entities/member.entity';
import { buildDirectoryMemberDTO } from './directory-member.dto';

function buildMember(overrides: Partial<Member> = {}): Member {
  return {
    id: 'member-1',
    tenantId: 't1',
    userId: null,
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
    situacao: 'desligado',
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

describe('buildDirectoryMemberDTO — privacidade da proveniência GLEG', () => {
  it('nunca inclui documentoNumero/observacoes/anexos/sourceCode no DTO do Diretório', () => {
    const member = buildMember();
    const dto = buildDirectoryMemberDTO(member, null, null, {
      cargoAtual: null,
      comissoes: [],
    });

    const serialized = JSON.stringify(dto);
    // Regra dura, não opcional (spec §4): nenhum desses campos pode
    // aparecer em nenhuma serialização do Diretório, mesmo indiretamente —
    // hoje `DirectoryMemberDTO` nem referencia `MemberSituationRecord`,
    // este teste é a garantia de regressão caso isso mude no futuro.
    expect(serialized).not.toMatch(/documentoNumero/i);
    expect(serialized).not.toMatch(/observacoes/i);
    expect(serialized).not.toMatch(/anexos/i);
    expect(serialized).not.toMatch(/sourceCode/i);
    expect(dto).not.toHaveProperty('documentoNumero');
    expect(dto).not.toHaveProperty('observacoes');
    expect(dto).not.toHaveProperty('anexos');
    expect(dto).not.toHaveProperty('sourceCode');
    expect(dto).not.toHaveProperty('recordKind');
  });
});
