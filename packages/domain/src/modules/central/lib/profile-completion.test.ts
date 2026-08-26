import { describe, expect, it } from 'vitest';
import type { Member } from '../../membership/entities/member.entity';
import type { MemberCentralProfile } from '../entities/member-central-profile.entity';
import { calculateProfileCompletion } from './profile-completion';

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

describe('calculateProfileCompletion', () => {
  it('devolve 0 pra membro/perfil totalmente vazios', () => {
    expect(calculateProfileCompletion(buildMember(), null)).toBe(0);
  });

  it('devolve 100 quando todas as categorias estão preenchidas', () => {
    const member = buildMember({
      fotoUrl: 'https://example.com/foto.jpg',
      profissao: 'Engenheiro',
      empresa: 'ACME',
      telefone: '11999999999',
    });
    const profile = buildProfile({
      apresentacao: 'Olá!',
      competencias: ['Liderança'],
      externalLinks: {
        whatsapp: null,
        instagram: '@irmao',
        facebook: null,
        linkedin: null,
        lattes: null,
        site: null,
      },
    });

    expect(calculateProfileCompletion(member, profile)).toBe(100);
  });

  it('soma só o peso das categorias preenchidas (foto 10 + contatos 15)', () => {
    const member = buildMember({ fotoUrl: 'https://example.com/foto.jpg', whatsapp: '11999999999' });

    expect(calculateProfileCompletion(member, null)).toBe(25);
  });

  it('não lança erro em documento legado sem competencias/servicos/negocios (campos novos ausentes no Firestore)', () => {
    // Firestore é schemaless — um MemberCentralProfile gravado antes da
    // adição de `competencias`/`servicos` não tem essas chaves no documento
    // (undefined, não []). Simula isso com cast, sem passar pelo builder.
    const legacyProfile = {
      ...buildProfile(),
    } as MemberCentralProfile;
    delete (legacyProfile as { competencias?: string[] }).competencias;
    delete (legacyProfile as { servicos?: string[] }).servicos;

    expect(() => calculateProfileCompletion(buildMember(), legacyProfile)).not.toThrow();
  });

  it('conta "Empresa" preenchida por negócios OU por Member.empresa', () => {
    const memberComEmpresa = buildMember({ empresa: 'ACME' });
    expect(calculateProfileCompletion(memberComEmpresa, null)).toBe(10);

    const profileComNegocio = buildProfile({
      negocios: [
        {
          id: 'n1',
          nomeEmpresa: 'ACME',
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
          status: 'published',
          updatedAt: new Date('2026-01-01'),
        },
      ],
    });
    expect(calculateProfileCompletion(buildMember(), profileComNegocio)).toBe(10);
  });
});
