import { describe, expect, it } from 'vitest';
import { memberCentralProfileSchema } from './central.schema';

function baseInput() {
  return {
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
});
