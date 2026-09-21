import { describe, expect, it } from 'vitest';
import {
  memberSchema,
  memberSelfEditSchema,
  normalizeConjugeFields,
  type MemberFormValues,
} from './member.schema';

const BASE: Omit<MemberFormValues, 'grau' | 'dataIniciacao' | 'dataElevacao' | 'dataExaltacao'> = {
  nomeCompleto: 'Irmão de Teste',
  fotoUrl: null,
  email: 'irmao@vl6.test',
  telefone: null,
  whatsapp: null,
  endereco: null,
  dataNascimento: null,
  cim: 'M-1',
  situacao: 'ativo',
  lojaId: 'tenant-1',
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
  redesSociais: {},
  observacoes: null,
  autorizaDivulgacaoExterna: false,
};

describe('memberSchema — cadastro simplificado (só nome e e-mail obrigatórios)', () => {
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

  it('aceita aprendiz sem nenhuma data maçônica', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'aprendiz',
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
    });
    expect(result.success).toBe(true);
  });

  it('aceita companheiro sem data de elevação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'companheiro',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: null,
      dataExaltacao: null,
    });
    expect(result.success).toBe(true);
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

  it('aceita mestre sem data de exaltação', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'mestre',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: new Date('2021-01-01'),
      dataExaltacao: null,
    });
    expect(result.success).toBe(true);
  });

  it('aceita cadastro sem CIM', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      cim: null,
      grau: 'aprendiz',
      dataIniciacao: null,
      dataElevacao: null,
      dataExaltacao: null,
    });
    expect(result.success).toBe(true);
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

describe('memberSchema — estado civil', () => {
  it('rejeita um valor de estado civil fora do enum', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'aprendiz',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: null,
      dataExaltacao: null,
      estadoCivil: 'namorando',
    });
    expect(result.success).toBe(false);
  });

  it('aceita casado com dados da cônjuge', () => {
    const result = memberSchema.safeParse({
      ...BASE,
      grau: 'aprendiz',
      dataIniciacao: new Date('2020-01-01'),
      dataElevacao: null,
      dataExaltacao: null,
      estadoCivil: 'casado',
      conjugeNome: 'Maria',
      conjugeDataNascimento: new Date('1990-01-01'),
    });
    expect(result.success).toBe(true);
  });
});

describe('normalizeConjugeFields', () => {
  const conjuge = {
    conjugeNome: 'Maria',
    conjugeDataNascimento: new Date('1990-01-01'),
    conjugeAniversarioDia: 5,
    conjugeAniversarioMes: 6,
  };

  it.each(['casado', 'uniao_estavel', 'separado_judicialmente'] as const)(
    'preserva dados da cônjuge quando estado civil é %s',
    (estadoCivil) => {
      const result = normalizeConjugeFields({ estadoCivil, ...conjuge });
      expect(result.conjugeNome).toBe('Maria');
      expect(result.conjugeDataNascimento).toEqual(new Date('1990-01-01'));
      expect(result.conjugeAniversarioDia).toBe(5);
      expect(result.conjugeAniversarioMes).toBe(6);
    },
  );

  it.each(['solteiro', 'divorciado', 'viuvo'] as const)(
    'zera dados da cônjuge quando estado civil é %s',
    (estadoCivil) => {
      const result = normalizeConjugeFields({ estadoCivil, ...conjuge });
      expect(result.conjugeNome).toBeNull();
      expect(result.conjugeDataNascimento).toBeNull();
      expect(result.conjugeAniversarioDia).toBeNull();
      expect(result.conjugeAniversarioMes).toBeNull();
    },
  );

  it('zera dados da cônjuge quando estado civil é nulo', () => {
    const result = normalizeConjugeFields({ estadoCivil: null, ...conjuge });
    expect(result.conjugeNome).toBeNull();
    expect(result.conjugeDataNascimento).toBeNull();
    expect(result.conjugeAniversarioDia).toBeNull();
    expect(result.conjugeAniversarioMes).toBeNull();
  });
});

/**
 * Reclamação recorrente do Administrador: "Dados inválidos." travando o
 * card "Estado civil e endereço" inteiro por causa de um único campo em
 * branco (endereço incompleto, filho ainda sem nome). Endereço/filhos do
 * Irmão nunca podem ser tão estritos quanto o endereço institucional da
 * Loja (`addressSchema`, `tenant.schema.ts`) — o Irmão precisa poder salvar
 * o que já preencheu, mesmo incompleto.
 */
describe('memberSelfEditSchema — endereço e filhos nunca bloqueiam o salvamento por campo em branco', () => {
  const BASE_SELF_EDIT = {
    telefone: null,
    whatsapp: null,
    profissao: null,
    empresa: null,
    estadoCivil: null,
    conjugeNome: null,
    conjugeDataNascimento: null,
    conjugeAniversarioDia: null,
    conjugeAniversarioMes: null,
    dataCasamento: null,
    filhos: [],
  };

  it('aceita endereço com a maioria dos campos em branco (só CEP preenchido)', () => {
    const result = memberSelfEditSchema.safeParse({
      ...BASE_SELF_EDIT,
      endereco: {
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        pais: '',
        cep: '01310-100',
      },
    });
    expect(result.success).toBe(true);
  });

  it('aceita endereço totalmente em branco', () => {
    const result = memberSelfEditSchema.safeParse({
      ...BASE_SELF_EDIT,
      endereco: {
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        pais: '',
        cep: '',
      },
    });
    expect(result.success).toBe(true);
  });

  it('aceita filho ainda sem nome preenchido (linha "Adicionar filho(a)" em progresso)', () => {
    const result = memberSelfEditSchema.safeParse({
      ...BASE_SELF_EDIT,
      endereco: null,
      filhos: [{ id: 'filho-1', nome: '', aniversarioDia: 12, aniversarioMes: 5 }],
    });
    expect(result.success).toBe(true);
  });
});
