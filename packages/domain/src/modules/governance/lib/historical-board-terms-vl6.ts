/**
 * Nominata histórica da ARLS Verdadeira Luz nº 06 (1947–2026), transcrita
 * do documento "Histórico de 79 anos de Fundação" fornecido pela
 * Secretaria/Administração da Loja. Cobre só Venerável Mestre, 1º e 2º
 * Vigilante — os demais cargos institucionais de cada gestão histórica
 * não constavam no documento de origem.
 *
 * Usado só por `ImportHistoricalBoardTermsUseCase` (importação única,
 * disparada pelo Administrador em `/admin/pessoas/gestoes/importar-nominata`)
 * — não é consumido por nenhum fluxo de runtime normal.
 *
 * Datas são aproximadas quando o documento de origem não registrava o dia
 * exato: por convenção institucional da Loja (ver Gestão 2026/2027,
 * "junho a junho"), toda gestão sem data explícita vai de 1º de junho do
 * ano inicial a 31 de maio do ano seguinte. As 3 trocas de titular no meio
 * da gestão (1991/1992, 2007/2008, 2012/2013) usam o mês de transição
 * citado literalmente no documento. A "Gestão 2026/2027" atual já existe
 * no sistema — não faz parte desta lista.
 */

export interface HistoricalPositionSegment {
  cargo: 'veneravel_mestre' | 'primeiro_vigilante' | 'segundo_vigilante';
  nomeCompleto: string;
  dataInicio: string;
  dataFim: string;
}

export interface HistoricalBoardTermInput {
  nome: string;
  periodoInicio: string;
  periodoFim: string;
  /** Ordem cronológica dentro do cargo — o último segmento de cada cargo vira o titular "oficial" (`BoardPositionAssignment`) da gestão. */
  segments: HistoricalPositionSegment[];
}

export const HISTORICAL_BOARD_TERMS_VL6: HistoricalBoardTermInput[] = [
  {
    // Primeira Diretoria, antes do reconhecimento pela GLEG (1951) e da
    // interrupção dos trabalhos em 1953 — ver docs enviados pela Loja.
    nome: 'Gestão 1947/1953',
    periodoInicio: '1947-07-31',
    periodoFim: '1953-10-19',
    segments: [
      {
        cargo: 'veneravel_mestre',
        nomeCompleto: 'Olinto Pereira de Castro',
        dataInicio: '1947-07-31',
        dataFim: '1953-10-19',
      },
      {
        cargo: 'primeiro_vigilante',
        nomeCompleto: 'Newton Pereira de Castro',
        dataInicio: '1947-07-31',
        dataFim: '1953-10-19',
      },
      {
        cargo: 'segundo_vigilante',
        nomeCompleto: 'Pericles Bueno',
        dataInicio: '1947-07-31',
        dataFim: '1953-10-19',
      },
    ],
  },
  {
    nome: 'Gestão 1978/1979',
    periodoInicio: '1978-08-19',
    periodoFim: '1979-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Ribas Marques', dataInicio: '1978-08-19', dataFim: '1979-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Valério Teles Pires', dataInicio: '1978-08-19', dataFim: '1979-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Severino Maurício da Costa', dataInicio: '1978-08-19', dataFim: '1979-05-31' },
    ],
  },
  {
    nome: 'Gestão 1979/1980',
    periodoInicio: '1979-06-01',
    periodoFim: '1980-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Valério Teles Pires', dataInicio: '1979-06-01', dataFim: '1980-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Cairo Silva Leão', dataInicio: '1979-06-01', dataFim: '1980-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'João Eustáquio de Lima', dataInicio: '1979-06-01', dataFim: '1980-05-31' },
    ],
  },
  {
    nome: 'Gestão 1980/1981',
    periodoInicio: '1980-06-01',
    periodoFim: '1981-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'João Eustáquio de Lima', dataInicio: '1980-06-01', dataFim: '1981-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Valério Teles Pires', dataInicio: '1980-06-01', dataFim: '1981-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Cairo Silva Leão', dataInicio: '1980-06-01', dataFim: '1981-05-31' },
    ],
  },
  {
    // Documento original lista "1º VIG" duas vezes (Tasso Dias Noleto,
    // depois Moisés Vieira Clemente) — tratado aqui como 1º/2º Vig
    // respectivamente, provável erro de digitação do original.
    nome: 'Gestão 1981/1982',
    periodoInicio: '1981-06-01',
    periodoFim: '1982-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Flacílio Assunção de Lima', dataInicio: '1981-06-01', dataFim: '1982-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Tasso Dias Noleto', dataInicio: '1981-06-01', dataFim: '1982-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Moisés Vieira Clemente', dataInicio: '1981-06-01', dataFim: '1982-05-31' },
    ],
  },
  {
    nome: 'Gestão 1982/1983',
    periodoInicio: '1982-06-01',
    periodoFim: '1983-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Moisés Vieira Clemente', dataInicio: '1982-06-01', dataFim: '1983-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Oscavo Ribeiro de Lacerda', dataInicio: '1982-06-01', dataFim: '1983-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'João Venâncio Soares', dataInicio: '1982-06-01', dataFim: '1983-05-31' },
    ],
  },
  {
    nome: 'Gestão 1983/1984',
    periodoInicio: '1983-06-01',
    periodoFim: '1984-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Nilson Faria Moraes', dataInicio: '1983-06-01', dataFim: '1984-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Luiz José Alves', dataInicio: '1983-06-01', dataFim: '1984-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Manoel de Souza Vitorelli Bassi', dataInicio: '1983-06-01', dataFim: '1984-05-31' },
    ],
  },
  {
    nome: 'Gestão 1984/1985',
    periodoInicio: '1984-06-01',
    periodoFim: '1985-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Luiz José Alves', dataInicio: '1984-06-01', dataFim: '1985-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Manoel de Souza Vitorelli Bassi', dataInicio: '1984-06-01', dataFim: '1985-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Moisés Vieira Clemente', dataInicio: '1984-06-01', dataFim: '1985-05-31' },
    ],
  },
  {
    nome: 'Gestão 1985/1986',
    periodoInicio: '1985-06-01',
    periodoFim: '1986-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Moisés Vieira Clemente', dataInicio: '1985-06-01', dataFim: '1986-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Beraldo Aniceto Ferreira', dataInicio: '1985-06-01', dataFim: '1986-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Divínio Vilela Leão', dataInicio: '1985-06-01', dataFim: '1986-05-31' },
    ],
  },
  {
    nome: 'Gestão 1986/1987',
    periodoInicio: '1986-06-01',
    periodoFim: '1987-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Manoel de Souza Vitorelli Bassi', dataInicio: '1986-06-01', dataFim: '1987-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'João Batista Alves', dataInicio: '1986-06-01', dataFim: '1987-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Waldenir Ferreira Pinto', dataInicio: '1986-06-01', dataFim: '1987-05-31' },
    ],
  },
  {
    nome: 'Gestão 1987/1988',
    periodoInicio: '1987-06-01',
    periodoFim: '1988-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Francisco Barreto Filho', dataInicio: '1987-06-01', dataFim: '1988-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Rubens Gomes da Silva', dataInicio: '1987-06-01', dataFim: '1988-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Adelor Cruvinel Leão', dataInicio: '1987-06-01', dataFim: '1988-05-31' },
    ],
  },
  {
    nome: 'Gestão 1988/1989',
    periodoInicio: '1988-06-01',
    periodoFim: '1989-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Waldenir Ferreira Pinto', dataInicio: '1988-06-01', dataFim: '1989-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Gilberto Santos de Oliveira', dataInicio: '1988-06-01', dataFim: '1989-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Wander Cruvinel Ferreira', dataInicio: '1988-06-01', dataFim: '1989-05-31' },
    ],
  },
  {
    nome: 'Gestão 1989/1990',
    periodoInicio: '1989-06-01',
    periodoFim: '1990-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Pedro Machado de Lima', dataInicio: '1989-06-01', dataFim: '1990-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Antônio José Neto', dataInicio: '1989-06-01', dataFim: '1990-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Adelor Cruvinel Neto', dataInicio: '1989-06-01', dataFim: '1990-05-31' },
    ],
  },
  {
    nome: 'Gestão 1990/1991',
    periodoInicio: '1990-06-01',
    periodoFim: '1991-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Ridomar Macedo de Lima', dataInicio: '1990-06-01', dataFim: '1991-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Valério Teles Pires', dataInicio: '1990-06-01', dataFim: '1991-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'João Batista Alves', dataInicio: '1990-06-01', dataFim: '1991-05-31' },
    ],
  },
  {
    // Troca de Venerável em novembro/1991 (mudança de Oriente do Ir. Anézio)
    // — os 3 cargos mudaram de titular no mesmo mês, conforme o documento.
    nome: 'Gestão 1991/1992',
    periodoInicio: '1991-06-01',
    periodoFim: '1992-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Anézio Ferreira de Assunção', dataInicio: '1991-06-01', dataFim: '1991-10-31' },
      { cargo: 'veneravel_mestre', nomeCompleto: 'Ivam Damasceno', dataInicio: '1991-11-01', dataFim: '1992-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Ivam Damasceno', dataInicio: '1991-06-01', dataFim: '1991-10-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'João Batista Alves', dataInicio: '1991-11-01', dataFim: '1992-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Sebastião de Oliveira Carmo', dataInicio: '1991-06-01', dataFim: '1991-10-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Beraldo Aniceto Ferreira', dataInicio: '1991-11-01', dataFim: '1992-05-31' },
    ],
  },
  {
    nome: 'Gestão 1992/1993',
    periodoInicio: '1992-06-01',
    periodoFim: '1993-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Divínio Vilela Leão', dataInicio: '1992-06-01', dataFim: '1993-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Ridomar Macedo de Lima', dataInicio: '1992-06-01', dataFim: '1993-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'João Eustáquio de Lima', dataInicio: '1992-06-01', dataFim: '1993-05-31' },
    ],
  },
  {
    nome: 'Gestão 1993/1994',
    periodoInicio: '1993-06-01',
    periodoFim: '1994-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Waldenir Ferreira Pinto', dataInicio: '1993-06-01', dataFim: '1994-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Walter Borges dos Santos', dataInicio: '1993-06-01', dataFim: '1994-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Aparecido Molero Romero', dataInicio: '1993-06-01', dataFim: '1994-05-31' },
    ],
  },
  {
    nome: 'Gestão 1994/1995',
    periodoInicio: '1994-06-01',
    periodoFim: '1995-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Ivam Damasceno', dataInicio: '1994-06-01', dataFim: '1995-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Aparecido Molero Romero', dataInicio: '1994-06-01', dataFim: '1995-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Walter Borges dos Santos', dataInicio: '1994-06-01', dataFim: '1995-05-31' },
    ],
  },
  {
    nome: 'Gestão 1995/1996',
    periodoInicio: '1995-06-01',
    periodoFim: '1996-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Aparecido Molero Romero', dataInicio: '1995-06-01', dataFim: '1996-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Orlando Bernardes da Silveira', dataInicio: '1995-06-01', dataFim: '1996-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Milson Ferreira Filho', dataInicio: '1995-06-01', dataFim: '1996-05-31' },
    ],
  },
  {
    nome: 'Gestão 1996/1997',
    periodoInicio: '1996-06-01',
    periodoFim: '1997-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Osvaldo Monteiro dos Santos', dataInicio: '1996-06-01', dataFim: '1997-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Orlando Bernardes da Silveira', dataInicio: '1996-06-01', dataFim: '1997-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Benedito dos Reis Lima', dataInicio: '1996-06-01', dataFim: '1997-05-31' },
    ],
  },
  {
    nome: 'Gestão 1997/1998',
    periodoInicio: '1997-06-01',
    periodoFim: '1998-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Orlando Bernardes da Silveira', dataInicio: '1997-06-01', dataFim: '1998-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Benedito dos Reis Lima', dataInicio: '1997-06-01', dataFim: '1998-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Manoel Rodrigues Filho', dataInicio: '1997-06-01', dataFim: '1998-05-31' },
    ],
  },
  {
    nome: 'Gestão 1998/1999',
    periodoInicio: '1998-06-01',
    periodoFim: '1999-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Manoel Rodrigues Filho', dataInicio: '1998-06-01', dataFim: '1999-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Oscavo Ribeiro de Lacerda', dataInicio: '1998-06-01', dataFim: '1999-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Beraldo Aniceto Ferreira', dataInicio: '1998-06-01', dataFim: '1999-05-31' },
    ],
  },
  {
    nome: 'Gestão 1999/2000',
    periodoInicio: '1999-06-01',
    periodoFim: '2000-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Maurício Miguel', dataInicio: '1999-06-01', dataFim: '2000-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Rodolfo Alexandre André', dataInicio: '1999-06-01', dataFim: '2000-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Elson Martins Costa', dataInicio: '1999-06-01', dataFim: '2000-05-31' },
    ],
  },
  {
    nome: 'Gestão 2000/2001',
    periodoInicio: '2000-06-01',
    periodoFim: '2001-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Maurício Borges de Sousa', dataInicio: '2000-06-01', dataFim: '2001-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Elson Martins Costa', dataInicio: '2000-06-01', dataFim: '2001-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Deoclides Almeida da Silva', dataInicio: '2000-06-01', dataFim: '2001-05-31' },
    ],
  },
  {
    nome: 'Gestão 2001/2002',
    periodoInicio: '2001-06-01',
    periodoFim: '2002-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Márcio Alexandre P. Pinto', dataInicio: '2001-06-01', dataFim: '2002-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Deoclides Almeida da Silva', dataInicio: '2001-06-01', dataFim: '2002-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Beraldo Aniceto Ferreira', dataInicio: '2001-06-01', dataFim: '2002-05-31' },
    ],
  },
  {
    nome: 'Gestão 2002/2003',
    periodoInicio: '2002-06-01',
    periodoFim: '2003-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Orlando Bernardes da Silveira', dataInicio: '2002-06-01', dataFim: '2003-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Beraldo Aniceto Ferreira', dataInicio: '2002-06-01', dataFim: '2003-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Paulo César Chavaglia', dataInicio: '2002-06-01', dataFim: '2003-05-31' },
    ],
  },
  {
    nome: 'Gestão 2003/2005',
    periodoInicio: '2003-06-01',
    periodoFim: '2005-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Deoclides Almeida da Silva', dataInicio: '2003-06-01', dataFim: '2005-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Paulo César Chavaglia', dataInicio: '2003-06-01', dataFim: '2005-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Sebastião Cirilo de Melo', dataInicio: '2003-06-01', dataFim: '2005-05-31' },
    ],
  },
  {
    nome: 'Gestão 2005/2006',
    periodoInicio: '2005-06-01',
    periodoFim: '2006-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Pedro Velasco Júnior', dataInicio: '2005-06-01', dataFim: '2006-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Eduardo Pereira Ribeiro', dataInicio: '2005-06-01', dataFim: '2006-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Adalberto José da Silva', dataInicio: '2005-06-01', dataFim: '2006-05-31' },
    ],
  },
  {
    nome: 'Gestão 2006/2007',
    periodoInicio: '2006-06-01',
    periodoFim: '2007-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Eduardo Pereira Ribeiro', dataInicio: '2006-06-01', dataFim: '2007-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Adalberto José da Silva', dataInicio: '2006-06-01', dataFim: '2007-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Cícero Otaviano Teixeira', dataInicio: '2006-06-01', dataFim: '2007-05-31' },
    ],
  },
  {
    // Troca de Venerável em setembro/2007 (mudança de Oriente do Ir.
    // Adalberto para SP) — 1º/2º Vig continuaram os mesmos.
    nome: 'Gestão 2007/2008',
    periodoInicio: '2007-06-01',
    periodoFim: '2008-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Adalberto José da Silva', dataInicio: '2007-06-01', dataFim: '2007-08-31' },
      { cargo: 'veneravel_mestre', nomeCompleto: 'Antônio Sérgio Colin', dataInicio: '2007-09-01', dataFim: '2008-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Lucivaldo Tavares Medeiros', dataInicio: '2007-06-01', dataFim: '2008-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Eduardo Rodrigues Lima', dataInicio: '2007-06-01', dataFim: '2008-05-31' },
    ],
  },
  {
    nome: 'Gestão 2008/2009',
    periodoInicio: '2008-06-01',
    periodoFim: '2009-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Lucivaldo Tavares Medeiros', dataInicio: '2008-06-01', dataFim: '2009-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Parisi Mário Vittorio', dataInicio: '2008-06-01', dataFim: '2009-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Cícero Otaviano Teixeira', dataInicio: '2008-06-01', dataFim: '2009-05-31' },
    ],
  },
  {
    nome: 'Gestão 2009/2010',
    periodoInicio: '2009-06-01',
    periodoFim: '2010-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Parisi Mário Vittorio', dataInicio: '2009-06-01', dataFim: '2010-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Cícero Otaviano Teixeira', dataInicio: '2009-06-01', dataFim: '2010-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Vinícius Bozzolan de Lima', dataInicio: '2009-06-01', dataFim: '2010-05-31' },
    ],
  },
  {
    nome: 'Gestão 2010/2011',
    periodoInicio: '2010-06-01',
    periodoFim: '2011-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Cícero Otaviano Teixeira', dataInicio: '2010-06-01', dataFim: '2011-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Vinícius Bozzolan de Lima', dataInicio: '2010-06-01', dataFim: '2011-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Eduardo Rodrigues Lima', dataInicio: '2010-06-01', dataFim: '2011-05-31' },
    ],
  },
  {
    nome: 'Gestão 2011/2012',
    periodoInicio: '2011-06-01',
    periodoFim: '2012-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Vinícius Bozzolan de Lima', dataInicio: '2011-06-01', dataFim: '2012-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Eduardo Rodrigues Lima', dataInicio: '2011-06-01', dataFim: '2012-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Timóteo David Marcelino de Oliveira', dataInicio: '2011-06-01', dataFim: '2012-05-31' },
    ],
  },
  {
    // Ir. Eduardo Lima, acometido por enfermidade grave, foi substituído
    // interinamente pelo 1º Vig. Ricardo Hahimoto de Menezes em nov/2012
    // (sem nova eleição) — Ricardo assume "ad hoc" até o fim da gestão.
    nome: 'Gestão 2012/2013',
    periodoInicio: '2012-06-01',
    periodoFim: '2013-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Eduardo Rodrigues Lima', dataInicio: '2012-06-01', dataFim: '2012-10-31' },
      { cargo: 'veneravel_mestre', nomeCompleto: 'Ricardo Hahimoto de Menezes', dataInicio: '2012-11-01', dataFim: '2013-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Ricardo Hahimoto de Menezes', dataInicio: '2012-06-01', dataFim: '2012-10-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Timóteo David Marcelino de Oliveira', dataInicio: '2012-11-01', dataFim: '2013-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Timóteo David Marcelino de Oliveira', dataInicio: '2012-06-01', dataFim: '2012-10-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Gustavo César Minelli Martins', dataInicio: '2012-11-01', dataFim: '2013-05-31' },
    ],
  },
  {
    nome: 'Gestão 2013/2014',
    periodoInicio: '2013-06-01',
    periodoFim: '2014-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Edivaldo Conceição de Melo', dataInicio: '2013-06-01', dataFim: '2014-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Sebastião Lázaro Pereira', dataInicio: '2013-06-01', dataFim: '2014-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Fernando Rodrigues de Sousa', dataInicio: '2013-06-01', dataFim: '2014-05-31' },
    ],
  },
  {
    nome: 'Gestão 2014/2015',
    periodoInicio: '2014-06-01',
    periodoFim: '2015-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Sebastião Lázaro Pereira', dataInicio: '2014-06-01', dataFim: '2015-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Fernando Rodrigues de Sousa', dataInicio: '2014-06-01', dataFim: '2015-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Arício Vieira da Silva', dataInicio: '2014-06-01', dataFim: '2015-05-31' },
    ],
  },
  {
    nome: 'Gestão 2015/2016',
    periodoInicio: '2015-06-01',
    periodoFim: '2016-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Fernando Rodrigues de Sousa', dataInicio: '2015-06-01', dataFim: '2016-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Arício Vieira da Silva', dataInicio: '2015-06-01', dataFim: '2016-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Bruno Langoni Salgado', dataInicio: '2015-06-01', dataFim: '2016-05-31' },
    ],
  },
  {
    nome: 'Gestão 2016/2017',
    periodoInicio: '2016-06-01',
    periodoFim: '2017-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Arício Vieira da Silva', dataInicio: '2016-06-01', dataFim: '2017-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Bruno Langoni Salgado', dataInicio: '2016-06-01', dataFim: '2017-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Moisés Davi Ramos', dataInicio: '2016-06-01', dataFim: '2017-05-31' },
    ],
  },
  {
    nome: 'Gestão 2017/2018',
    periodoInicio: '2017-06-01',
    periodoFim: '2018-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Bruno Langoni Salgado', dataInicio: '2017-06-01', dataFim: '2018-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Irumuara Interaminense Uliana', dataInicio: '2017-06-01', dataFim: '2018-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'João Mário Vieira de Paula e Silva', dataInicio: '2017-06-01', dataFim: '2018-05-31' },
    ],
  },
  {
    nome: 'Gestão 2018/2019',
    periodoInicio: '2018-06-01',
    periodoFim: '2019-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Irumuara Interaminense Uliana', dataInicio: '2018-06-01', dataFim: '2019-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'João Mário Vieira de Paula e Silva', dataInicio: '2018-06-01', dataFim: '2019-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Dino Moraes de Sousa', dataInicio: '2018-06-01', dataFim: '2019-05-31' },
    ],
  },
  {
    nome: 'Gestão 2019/2020',
    periodoInicio: '2019-06-01',
    periodoFim: '2020-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'João Mário Vieira de Paula e Silva', dataInicio: '2019-06-01', dataFim: '2020-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Dino Moraes de Sousa', dataInicio: '2019-06-01', dataFim: '2020-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Ricardo Abou Rjeili', dataInicio: '2019-06-01', dataFim: '2020-05-31' },
    ],
  },
  {
    nome: 'Gestão 2020/2021',
    periodoInicio: '2020-06-01',
    periodoFim: '2021-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Dino Moraes de Sousa', dataInicio: '2020-06-01', dataFim: '2021-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Ricardo Abou Rjeili', dataInicio: '2020-06-01', dataFim: '2021-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Fernando Veríssimo', dataInicio: '2020-06-01', dataFim: '2021-05-31' },
    ],
  },
  {
    nome: 'Gestão 2021/2022',
    periodoInicio: '2021-06-01',
    periodoFim: '2022-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Ricardo Abou Rjeili', dataInicio: '2021-06-01', dataFim: '2022-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Fernando Veríssimo', dataInicio: '2021-06-01', dataFim: '2022-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Célio Fernando de Paula', dataInicio: '2021-06-01', dataFim: '2022-05-31' },
    ],
  },
  {
    nome: 'Gestão 2022/2023',
    periodoInicio: '2022-06-01',
    periodoFim: '2023-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Fernando Veríssimo', dataInicio: '2022-06-01', dataFim: '2023-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Célio Fernando de Paula', dataInicio: '2022-06-01', dataFim: '2023-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Timóteo David Marcelino de Oliveira', dataInicio: '2022-06-01', dataFim: '2023-05-31' },
    ],
  },
  {
    nome: 'Gestão 2023/2024',
    periodoInicio: '2023-06-01',
    periodoFim: '2024-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Célio Fernando de Paula', dataInicio: '2023-06-01', dataFim: '2024-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Timóteo David Marcelino de Oliveira', dataInicio: '2023-06-01', dataFim: '2024-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Helton José Chacarosque da Silva', dataInicio: '2023-06-01', dataFim: '2024-05-31' },
    ],
  },
  {
    nome: 'Gestão 2024/2025',
    periodoInicio: '2024-06-01',
    periodoFim: '2025-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Timóteo David Marcelino de Oliveira', dataInicio: '2024-06-01', dataFim: '2025-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Helton José Chacarosque da Silva', dataInicio: '2024-06-01', dataFim: '2025-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Dino Moraes de Sousa', dataInicio: '2024-06-01', dataFim: '2025-05-31' },
    ],
  },
  {
    nome: 'Gestão 2025/2026',
    periodoInicio: '2025-06-01',
    periodoFim: '2026-05-31',
    segments: [
      { cargo: 'veneravel_mestre', nomeCompleto: 'Helton José Chacarosque da Silva', dataInicio: '2025-06-01', dataFim: '2026-05-31' },
      { cargo: 'primeiro_vigilante', nomeCompleto: 'Dino Moraes de Sousa', dataInicio: '2025-06-01', dataFim: '2026-05-31' },
      { cargo: 'segundo_vigilante', nomeCompleto: 'Evando Carmo Peres', dataInicio: '2025-06-01', dataFim: '2026-05-31' },
    ],
  },
];
