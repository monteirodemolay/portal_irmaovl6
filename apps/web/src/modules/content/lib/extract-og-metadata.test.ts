import { describe, expect, it } from 'vitest';
import { extractOgMetadata } from './extract-og-metadata';

describe('extractOgMetadata', () => {
  it('extrai og:title, og:description, og:image e article:published_time', () => {
    const html = `
      <html><head>
        <title>Título da aba</title>
        <meta property="og:title" content="Loja inaugura novo templo" />
        <meta property="og:description" content="Uma cerim&ocirc;nia especial marcou o evento." />
        <meta property="og:image" content="https://www.vl6.com.br/img/capa.jpg" />
        <meta property="article:published_time" content="2026-08-01T12:00:00-03:00" />
      </head><body></body></html>
    `;

    const result = extractOgMetadata(html);

    expect(result.title).toBe('Loja inaugura novo templo');
    expect(result.image).toBe('https://www.vl6.com.br/img/capa.jpg');
    expect(result.publishedAt).toBe('2026-08-01T12:00:00-03:00');
  });

  it('usa <title> como reserva quando não há og:title', () => {
    const html = '<html><head><title>Notícia sem OG</title></head></html>';

    expect(extractOgMetadata(html).title).toBe('Notícia sem OG');
  });

  it('decodifica entidades HTML comuns e numéricas', () => {
    const html =
      '<meta property="og:description" content="A &amp; B &#8212; C &#x2013; D" />';

    expect(extractOgMetadata(html).description).toBe('A & B — C – D');
  });

  it('retorna tudo null quando não encontra nenhuma tag', () => {
    const result = extractOgMetadata('<html><head></head></html>');

    expect(result).toEqual({ title: null, description: null, image: null, publishedAt: null });
  });

  it('funciona com aspas simples nos atributos', () => {
    const html = "<meta property='og:title' content='Notícia com aspas simples' />";

    expect(extractOgMetadata(html).title).toBe('Notícia com aspas simples');
  });
});
