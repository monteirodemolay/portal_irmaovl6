import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { resolveActiveNavigation } from './navigation-selection';
import { contextualHref, resolveOrigin } from './context';

describe('stable module navigation', () => {
  const items = [
    { href: '/admin' },
    { href: '/admin/acervo' },
    { href: '/admin/acervo/biblioteca' },
    { href: '/admin/publicacoes', activePaths: ['/admin/conteudo', '/admin/comunicacao'] },
  ];
  it('selects the most specific section, regardless of ordering', () => {
    assert.equal(resolveActiveNavigation(items, '/admin/acervo/biblioteca/livro')?.href, '/admin/acervo/biblioteca');
    assert.equal(resolveActiveNavigation([...items].reverse(), '/admin/acervo/biblioteca/livro')?.href, '/admin/acervo/biblioteca');
  });
  it('does not mark the dashboard as active throughout administration', () => {
    assert.equal(resolveActiveNavigation([{ href: '/admin' }], '/admin/pessoas'), undefined);
  });
  it('matches alternate editorial routes', () => {
    assert.equal(resolveActiveNavigation(items, '/admin/comunicacao/modelos')?.href, '/admin/publicacoes');
  });
  it('ignores filters and anchors while resolving the active section', () => {
    assert.equal(resolveActiveNavigation(items, '/admin/acervo/biblioteca?q=teste#resultados')?.href, '/admin/acervo/biblioteca');
  });
  it('does not confuse routes with similar prefixes', () => {
    assert.equal(resolveActiveNavigation([{ href: '/irmaos' }], '/irmaos-outro'), undefined);
  });
  it('keeps old archive routes within Acervo', () => {
    const archive = { href: '/acervo', activePaths: ['/downloads', '/biblioteca', '/arquivos', '/galeria'] };
    for (const path of archive.activePaths) assert.equal(resolveActiveNavigation([archive], path), archive);
  });
  it('uses the overview when no more specific archive section matches', () => {
    assert.equal(resolveActiveNavigation([{ href: '/acervo' }, { href: '/acervo/biblioteca' }], '/acervo/eventos/123')?.href, '/acervo');
  });
  it('keeps formation and lesson detail pages in Formações', () => {
    const formations = { href: '/conhecimento/formacoes', activePaths: ['/conhecimento/formacao', '/conhecimento/aula'] };
    assert.equal(resolveActiveNavigation([{ href: '/conhecimento' }, formations], '/conhecimento/aula/1/2'), formations);
  });
  it('preserves legacy archive origin and its filters', () => {
    const origin = resolveOrigin('/downloads?q=historia');
    assert.equal(origin?.module, '/acervo');
    assert.equal(new URL(contextualHref('/noticias/123', origin), 'https://portal.invalid').searchParams.get('from'), '/downloads?q=historia');
  });
  it('preserves origin when opening actual knowledge detail routes', () => {
    for (const path of ['/conhecimento/formacao/1', '/conhecimento/aula/1/2']) {
      assert.equal(new URL(contextualHref(path, resolveOrigin('/acervo')), 'https://portal.invalid').searchParams.get('from'), '/acervo');
    }
  });
  it('explicit module changes clear the previous journey', () => {
    assert.equal(contextualHref('/conhecimento', resolveOrigin('/acervo')), '/conhecimento');
  });
  it('rejects external, administrative and malformed origins', () => {
    for (const value of ['//example.com', 'https://example.com', '/admin', '/\\example.com']) assert.equal(resolveOrigin(value), null);
  });
});
