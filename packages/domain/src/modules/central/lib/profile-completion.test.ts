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

  it('devolve 100 quando todas as categorias fundamentais estão preenchidas', () => {
    const member = buildMember({
      fotoUrl: 'https://example.com/foto.jpg',
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

  it('Irmão aposentado, sem negócio, com foto + apresentação + contato + uma rede social chega a 95% — perto o bastante de 100% sem precisar de dado profissional', () => {
    // Caso central pedido pelo Administrador: profissao/empresa/negocios
    // ficam null (não se aplicam a um aposentado) e mesmo assim o
    // resultado fica bem próximo do topo. Só falta o complemento opcional
    // de competências/serviços (peso 5) pra fechar os 100%.
    const member = buildMember({
      fotoUrl: 'https://example.com/foto.jpg',
      telefone: '11999999999',
      profissao: null,
      empresa: null,
    });
    const profile = buildProfile({
      apresentacao: 'Aposentado, dedico meu tempo à Loja e à família.',
      externalLinks: {
        whatsapp: null,
        instagram: '@irmao',
        facebook: null,
        linkedin: null,
        lattes: null,
        site: null,
      },
    });

    expect(calculateProfileCompletion(member, profile)).toBe(95);
  });

  it('dados de trabalho/profissão/negócio não contam mais pro cálculo — só o peso das categorias de perfil pessoal preenchidas', () => {
    const member = buildMember({
      fotoUrl: 'https://example.com/foto.jpg',
      whatsapp: '11999999999',
      profissao: 'Engenheiro',
      empresa: 'ACME',
    });
    const profile = buildProfile({
      areaAtuacao: 'engenharia',
      resumoProfissional: 'Muitos anos de experiência',
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

    // Só foto (20) + contato (25) contam — nenhum campo de trabalho/negócio
    // participa do cálculo.
    expect(calculateProfileCompletion(member, profile)).toBe(45);
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
});
