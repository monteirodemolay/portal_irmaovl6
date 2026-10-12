import { describe, expect, it } from 'vitest';
import {
  filterHonors,
  honorPendings,
  honorSummary,
  honorYears,
  type HonorRow,
} from './honor-admin-view';

const row = (over: Partial<HonorRow>): HonorRow => ({
  id: 'h',
  nomeOficial: 'Medalha do Mérito',
  tipo: 'medalha',
  homenageado: 'João Álvares',
  memberId: 'm1',
  instituicao: 'Grande Loja',
  data: '2024-05-10T12:00:00Z',
  numeroAto: '12/2024',
  temDiploma: true,
  temFoto: false,
  ...over,
});
const all = [
  row({ id: '1' }),
  row({
    id: '2',
    tipo: 'diploma',
    homenageado: 'Pedro Externo',
    memberId: null,
    data: null,
    numeroAto: null,
  }),
  row({ id: '3', tipo: 'medalha', data: '2022-01-05T12:00:00Z', temDiploma: false }),
];
const none = { query: '', tipo: 'Todos', year: 'Todos', pending: 'Todos' };

describe('honrarias na Administração', () => {
  it('lista o que falta em cada registro', () => {
    expect(honorPendings(all[1]!)).toEqual(['sem-data', 'sem-ato']);
    expect(honorPendings(all[0]!)).toEqual([]);
  });

  it('busca sem acento por homenageado, título ou instituição', () => {
    expect(filterHonors(all, { ...none, query: 'joao alvares' }).map((r) => r.id)).toEqual([
      '1',
      '3',
    ]);
    expect(filterHonors(all, { ...none, query: 'grande loja' })).toHaveLength(3);
  });

  it('filtra por tipo, ano e pendência', () => {
    expect(filterHonors(all, { ...none, tipo: 'diploma' }).map((r) => r.id)).toEqual(['2']);
    expect(filterHonors(all, { ...none, year: '2022' }).map((r) => r.id)).toEqual(['3']);
    expect(filterHonors(all, { ...none, pending: 'sem-diploma' }).map((r) => r.id)).toEqual(['3']);
  });

  it('resume totais, externos e incompletas', () => {
    const s = honorSummary(all);
    expect(s).toMatchObject({ total: 3, externos: 1, incompletas: 2 });
    expect(s.byTipo.get('medalha')).toBe(2);
  });

  it('anos em ordem decrescente, sem repetir', () => {
    expect(honorYears(all)).toEqual(['2024', '2022']);
  });
});
