import { describe, expect, it } from 'vitest';
import { resolvePostLoginDestination } from './resolve-post-login-destination';

describe('resolvePostLoginDestination', () => {
  it('manda o Administrador Geral pra /plataforma', () => {
    expect(resolvePostLoginDestination('platform')).toBe('/plataforma');
  });

  it('manda qualquer Irmão de uma Loja pra Área do Irmão, independente do papel', () => {
    expect(resolvePostLoginDestination('t1')).toBe('/dashboard');
  });
});
