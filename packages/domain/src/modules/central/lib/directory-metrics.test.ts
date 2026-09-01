import { describe, expect, it } from 'vitest';
import type { DirectoryMemberDTO } from '../dtos/directory-member.dto';
import { computeAreaFacets, computeDirectoryFilterOptions, computeDirectoryMetrics } from './directory-metrics';

const EMPTY_OPTIONAL: DirectoryMemberDTO['optional'] = {
  apresentacao: null,
  profissional: null,
  competencias: null,
  servicos: null,
  negocios: null,
  empresaAtual: null,
  cidadeExibicao: null,
};

function buildDto(overrides: Partial<DirectoryMemberDTO> = {}): DirectoryMemberDTO {
  return {
    memberId: 'member-1',
    nomeCompleto: 'Irmão de Teste',
    fotoUrl: null,
    grau: 'mestre',
    situacao: 'ativo',
    dataIniciacao: null,
    cargoAtual: null,
    comissoes: [],
    profileState: 'institutional_only',
    ...overrides,
    optional: { ...EMPTY_OPTIONAL, ...overrides.optional },
  };
}

describe('computeDirectoryMetrics', () => {
  it('devolve tudo zerado pra um diretório vazio', () => {
    expect(computeDirectoryMetrics([])).toEqual({
      totalIrmaos: 0,
      totalAreas: 0,
      totalEmpresas: 0,
      totalCompetenciasCompartilhadas: 0,
    });
  });

  it('conta Irmãos institucionais mesmo sem nenhum bloco publicado', () => {
    const dtos = [buildDto(), buildDto({ memberId: 'member-2', profileState: 'draft' })];
    expect(computeDirectoryMetrics(dtos).totalIrmaos).toBe(2);
    expect(computeDirectoryMetrics(dtos).totalAreas).toBe(0);
  });

  it('deduplica empresas e competências (case-insensitive, com espaços)', () => {
    const dtos = [
      buildDto({
        profileState: 'published',
        optional: {
          apresentacao: null,
          profissional: {
            profissao: 'Advogado',
            areaAtuacao: 'Direito',
            areaAtuacaoKey: 'direito',
            formacao: null,
            resumoProfissional: null,
          },
          empresaAtual: 'ACME Ltda',
          competencias: ['Negociação'],
          servicos: null,
          negocios: null,
          cidadeExibicao: null,
        },
      }),
      buildDto({
        memberId: 'member-2',
        profileState: 'published',
        optional: {
          apresentacao: null,
          profissional: {
            profissao: 'Sócio',
            areaAtuacao: 'Direito',
            areaAtuacaoKey: 'direito',
            formacao: null,
            resumoProfissional: null,
          },
          negocios: [{ businessId: 'n1', nomeEmpresa: '  acme ltda  ', segmento: null }],
          competencias: null,
          servicos: ['negociação'],
          empresaAtual: null,
          cidadeExibicao: null,
        },
      }),
    ];

    const metrics = computeDirectoryMetrics(dtos);
    expect(metrics.totalIrmaos).toBe(2);
    expect(metrics.totalAreas).toBe(1);
    expect(metrics.totalEmpresas).toBe(1);
    expect(metrics.totalCompetenciasCompartilhadas).toBe(1);
  });
});

describe('computeAreaFacets', () => {
  it('conta só áreas com pelo menos 1 Irmão, ordenado desc', () => {
    const dtos = [
      buildDto({
        profileState: 'published',
        optional: {
          apresentacao: null,
          profissional: {
            profissao: null,
            areaAtuacao: 'Direito',
            areaAtuacaoKey: 'direito',
            formacao: null,
            resumoProfissional: null,
          },
          competencias: null,
          servicos: null,
          negocios: null,
          empresaAtual: null,
          cidadeExibicao: null,
        },
      }),
      buildDto({
        memberId: 'member-2',
        profileState: 'published',
        optional: {
          apresentacao: null,
          profissional: {
            profissao: null,
            areaAtuacao: 'Direito',
            areaAtuacaoKey: 'direito',
            formacao: null,
            resumoProfissional: null,
          },
          competencias: null,
          servicos: null,
          negocios: null,
          empresaAtual: null,
          cidadeExibicao: null,
        },
      }),
      buildDto({ memberId: 'member-3' }),
    ];

    expect(computeAreaFacets(dtos)).toEqual([{ key: 'direito', label: 'Direito', count: 2 }]);
  });
});

describe('computeDirectoryFilterOptions', () => {
  it('cargos e comissões são institucionais — não dependem de publicação', () => {
    const dtos = [
      buildDto({ cargoAtual: 'Secretário', comissoes: [{ id: 'c1', nome: 'Beneficência' }] }),
      buildDto({ memberId: 'member-2', profileState: 'draft' }),
    ];

    const options = computeDirectoryFilterOptions(dtos);
    expect(options.cargos).toEqual([{ value: 'Secretário', count: 1 }]);
    expect(options.comissoes).toEqual([{ value: 'Beneficência', count: 1 }]);
  });
});
