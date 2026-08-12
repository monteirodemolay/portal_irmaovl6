import { describe, expect, it } from 'vitest';
import { memberSchema, type MemberFormValues } from './member.schema';

const BASE: Omit<MemberFormValues, 'grau' | 'dataIniciacao' | 'dataElevacao' | 'dataExaltacao'> = {
  nomeCompleto: 'Irmão de Teste',
  nomeMaconico: null,
  fotoUrl: null,
  email: 'irmao@vl6.test',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  cim: null,
  matricula: 'M-1',
  situacao: 'regular',
  lojaId: 'tenant-1',
  potencia: 'GOB',
  profissao: null,
  empresa: null,
  estadoCivil: null,
  biografia: null,
  redesSociais: {},
  observacoes: null,
};

describe('memberSchema — coerência de grau e datas maçônicas', () => {
  it('aceita aprendiz só com data de iniciação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'aprendiz',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: null,
      dataExaltacao: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita aprendiz sem data de iniciação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'aprendiz',
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita companheiro sem data de elevação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'companheiro',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: null,
      dataExaltacao: null,
    });
    expect(result.success).toBe(false);
  });

  it('aceita companheiro com iniciação e elevação, sem exaltação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'companheiro',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: new Date('2021-01-01'),
      dataExaltacao: null,
    });
    expect(result.success).toBe(true);
  });

  it('rejeita mestre sem data de exaltação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'mestre',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: new Date('2021-01-01'),
      dataExaltacao: null,
    });
    expect(result.success).toBe(false);
  });

  it('aceita mestre com as três datas em ordem', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'mestre',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: new Date('2021-01-01'),
      dataExaltacao: new Date('2022-01-01'),
    });
    expect(result.success).toBe(true);
  });

  it('rejeita elevação anterior à iniciação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'companheiro',
      dataIniciacao: new Date('2021-01-01'),
      dataElevacao: new Date('2020-01-01'),
      dataExaltacao: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejeita exaltação anterior à elevação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'mestre',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: new Date('2022-01-01'),
      dataExaltacao: new Date('2021-01-01'),
    });
    expect(result.success).toBe(false);
  });
});
