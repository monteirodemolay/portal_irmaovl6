import { describe, expect, it } from 'vitest';
import { centralAffiliationEntrySchema, memberCentralProfileSchema } from './central.schema';

function baseInput() {
  return {
    apresentacao: null,
    interesses: null,
    cidadeExibicao: null,
    areaAtuacao: null,
    areaAtuacaoOutra: null,
    especializacao: null,
    especializacaoOutra: null,
    formacao: null,
    resumoProfissional: null,
    negocios: [],
    competencias: [],
    servicos: [],
    afiliacoes: [],
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
  };
}

describe('memberCentralProfileSchema', () => {
  it('aceita uma chave válida da taxonomia de área de atuação', () => {
    const result = memberCentralProfileSchema.safeParse({ ...baseInput(), areaAtuacao: 'direito' });
    expect(result.success).toBe(true);
  });

  it('rejeita uma chave fora da taxonomia', () => {
    const result = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      areaAtuacao: 'astronomia',
    });
    expect(result.success).toBe(false);
  });

  it('exige areaAtuacaoOutra preenchido quando areaAtuacao é "outra"', () => {
    const semTexto = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      areaAtuacao: 'outra',
      areaAtuacaoOutra: null,
    });
    expect(semTexto.success).toBe(false);

    const comTexto = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      areaAtuacao: 'outra',
      areaAtuacaoOutra: 'Astronomia amadora',
    });
    expect(comTexto.success).toBe(true);
  });

  it('limita competências e serviços a 10 itens cada', () => {
    const excesso = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
    const result = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      competencias: excesso,
    });
    expect(result.success).toBe(false);

    const ok = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      competencias: excesso.slice(0, 10),
      servicos: excesso.slice(0, 10),
    });
    expect(ok.success).toBe(true);
  });

  it('aceita uma apresentação bem mais longa que o antigo limite de 500 caracteres (até 4000)', () => {
    const textoLongo = 'a'.repeat(3200);
    const result = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      apresentacao: textoLongo,
    });
    expect(result.success).toBe(true);

    const textoExcedente = 'a'.repeat(4001);
    const excedido = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      apresentacao: textoExcedente,
    });
    expect(excedido.success).toBe(false);
  });

  it('limita afiliações a 20 entradas', () => {
    const entry = {
      id: 'a1',
      nomeInstituicao: 'Instituição',
      papel: null,
      abrangencia: null,
      pais: null,
      descricao: null,
      siteUrl: null,
      instagram: null,
      logoUrl: null,
    };
    const excesso = Array.from({ length: 21 }, (_, i) => ({ ...entry, id: `a${i}` }));
    const result = memberCentralProfileSchema.safeParse({ ...baseInput(), afiliacoes: excesso });
    expect(result.success).toBe(false);

    const ok = memberCentralProfileSchema.safeParse({
      ...baseInput(),
      afiliacoes: excesso.slice(0, 20),
    });
    expect(ok.success).toBe(true);
  });
});

describe('centralAffiliationEntrySchema', () => {
  const base = {
    id: 'a1',
    nomeInstituicao: 'Rotary Club',
    papel: null,
    abrangencia: null,
    pais: null,
    descricao: null,
    siteUrl: null,
    instagram: null,
    logoUrl: null,
  };

  it('exige nomeInstituicao preenchido', () => {
    const result = centralAffiliationEntrySchema.safeParse({ ...base, nomeInstituicao: '' });
    expect(result.success).toBe(false);
  });

  it('rejeita siteUrl que não é uma URL válida', () => {
    const result = centralAffiliationEntrySchema.safeParse({ ...base, siteUrl: 'não é url' });
    expect(result.success).toBe(false);
  });

  it('aceita siteUrl nulo', () => {
    const result = centralAffiliationEntrySchema.safeParse({ ...base, siteUrl: null });
    expect(result.success).toBe(true);
  });

  it('só aceita as 3 chaves de abrangência', () => {
    const valido = centralAffiliationEntrySchema.safeParse({
      ...base,
      abrangencia: 'internacional',
    });
    expect(valido.success).toBe(true);

    const invalido = centralAffiliationEntrySchema.safeParse({
      ...base,
      abrangencia: 'global',
    });
    expect(invalido.success).toBe(false);
  });
});
