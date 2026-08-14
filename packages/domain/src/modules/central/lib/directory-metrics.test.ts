import { describe, expect, it } from 'vitest';
import type { PublicMemberProfileDTO } from '../dtos/public-member-profile.dto';
import { computeAreaFacets, computeDirectoryMetrics } from './directory-metrics';

function buildDto(overrides: Partial<PublicMemberProfileDTO> = {}): PublicMemberProfileDTO {
  return {
    memberId: 'member-1',
    nomeCompleto: 'Irmão de Teste',
    fotoUrl: null,
    grau: 'mestre',
    apresentacao: null,
    informacoesPessoais: null,
    profissional: null,
    negocios: null,
    empresaAtual: null,
    competencias: null,
    servicos: null,
    contatos: null,
    redes: null,
    informacoesMaconicas: null,
    ...overrides,
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

  it('deduplica empresas e competências (case-insensitive, com espaços)', () => {
    const dtos = [
      buildDto({
        profissional: {
          profissao: 'Advogado',
          areaAtuacao: 'Direito',
          areaAtuacaoKey: 'direito',
          formacao: null,
          resumoProfissional: null,
        },
        empresaAtual: 'ACME Ltda',
        competencias: ['Negociação'],
      }),
      buildDto({
        memberId: 'member-2',
        profissional: {
          profissao: 'Sócio',
          areaAtuacao: 'Direito',
          areaAtuacaoKey: 'direito',
          formacao: null,
          resumoProfissional: null,
        },
        negocios: [
          {
            id: 'n1',
            nomeEmpresa: '  acme ltda  ',
            segmento: null,
            cargo: null,
            descricao: null,
            cidade: null,
            telefoneComercial: null,
            siteUrl: null,
          },
        ],
        servicos: ['negociação'],
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
        profissional: {
          profissao: null,
          areaAtuacao: 'Direito',
          areaAtuacaoKey: 'direito',
          formacao: null,
          resumoProfissional: null,
        },
      }),
      buildDto({
        memberId: 'member-2',
        profissional: {
          profissao: null,
          areaAtuacao: 'Direito',
          areaAtuacaoKey: 'direito',
          formacao: null,
          resumoProfissional: null,
        },
      }),
      buildDto({ memberId: 'member-3', profissional: null }),
    ];

    expect(computeAreaFacets(dtos)).toEqual([{ key: 'direito', label: 'Direito', count: 2 }]);
  });
});
