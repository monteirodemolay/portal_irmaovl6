import { describe, expect, it } from 'vitest';
import { contextualHref, resolveOrigin } from './context';
describe('contextual navigation', () => {
  it('preserves the archive query and scroll anchor across recommendations', () => {
    const origin = resolveOrigin('/acervo/pesquisar?q=historia&ano=2026#resultados');
    const first = contextualHref('/noticias/primeira', origin);
    const next = contextualHref('/noticias/segunda', resolveOrigin(new URL(first, 'https://portal.invalid').searchParams.get('from')));
    expect(new URL(next, 'https://portal.invalid').searchParams.get('from')).toBe(origin?.href);
    expect(origin?.module).toBe('/acervo');
  });
  it('starts a new journey on explicit module and catalog navigation', () => {
    expect(contextualHref('/noticias', resolveOrigin('/acervo'))).toBe('/noticias');
    expect(contextualHref('/acervo/biblioteca/emprestimos', resolveOrigin('/conhecimento'))).toBe('/acervo/biblioteca/emprestimos');
  });
  it('rejects external or malformed return destinations', () => {
    for (const value of ['https://evil.test', '//evil.test', '/\\evil.test', '/admin', null]) expect(resolveOrigin(value)).toBeNull();
  });
  it('defaults to the canonical page without origin and avoids nested context', () => {
    expect(contextualHref('/noticias/exemplo', null)).toBe('/noticias/exemplo');
    expect(resolveOrigin('/noticias?from=%2Facervo')?.href).toBe('/noticias');
  });
});
