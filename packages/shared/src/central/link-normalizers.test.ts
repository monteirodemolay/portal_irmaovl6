import { describe, expect, it } from 'vitest';
import {
  buildWhatsappLink,
  isSafeExternalUrl,
  normalizeInstagram,
  normalizeWhatsapp,
  validateFacebookUrl,
  validateInstagramPostUrl,
  validateLattesUrl,
  validateLinkedInUrl,
  validateWebsiteUrl,
} from './link-normalizers';

describe('normalizeWhatsapp', () => {
  it('normaliza número com máscara e DDI implícito', () => {
    expect(normalizeWhatsapp('(64) 99999-9999')).toBe('5564999999999');
  });
  it('preserva DDI já informado', () => {
    expect(normalizeWhatsapp('5564999999999')).toBe('5564999999999');
  });
  it('rejeita entrada vazia ou curta demais', () => {
    expect(normalizeWhatsapp('')).toBeNull();
    expect(normalizeWhatsapp('123')).toBeNull();
  });
  it('gera link wa.me a partir do valor normalizado', () => {
    expect(buildWhatsappLink('5564999999999')).toBe('https://wa.me/5564999999999');
  });
});

describe('normalizeInstagram', () => {
  it('aceita @usuario', () => {
    expect(normalizeInstagram('@usuario')).toBe('https://instagram.com/usuario');
  });
  it('aceita usuario sem @', () => {
    expect(normalizeInstagram('usuario')).toBe('https://instagram.com/usuario');
  });
  it('aceita URL completa', () => {
    expect(normalizeInstagram('https://instagram.com/usuario')).toBe(
      'https://instagram.com/usuario',
    );
  });
  it('rejeita URL de outro domínio', () => {
    expect(normalizeInstagram('https://evil.example.com/usuario')).toBeNull();
  });
});

describe('validadores de domínio fixo', () => {
  it('valida LinkedIn', () => {
    expect(validateLinkedInUrl('https://www.linkedin.com/in/fulano')).toBe(
      'https://www.linkedin.com/in/fulano',
    );
    expect(validateLinkedInUrl('https://evil.example.com')).toBeNull();
  });
  it('valida Facebook', () => {
    expect(validateFacebookUrl('https://facebook.com/pagina')).toBe('https://facebook.com/pagina');
    expect(validateFacebookUrl('not a url')).toBeNull();
  });
  it('valida Lattes', () => {
    expect(validateLattesUrl('http://lattes.cnpq.br/123456')).toBe('http://lattes.cnpq.br/123456');
    expect(validateLattesUrl('https://lattes.fake.com/123456')).toBeNull();
  });
  it('valida link de post do Instagram, sem reescrever o caminho', () => {
    expect(validateInstagramPostUrl('https://instagram.com/p/abc123')).toBe(
      'https://instagram.com/p/abc123',
    );
    expect(validateInstagramPostUrl('https://evil.example.com/p/abc123')).toBeNull();
  });
});

describe('validateWebsiteUrl', () => {
  it('exige HTTPS', () => {
    expect(validateWebsiteUrl('https://exemplo.com')).toBe('https://exemplo.com/');
    expect(validateWebsiteUrl('http://exemplo.com')).toBeNull();
  });
});

describe('isSafeExternalUrl', () => {
  it('bloqueia protocolos perigosos', () => {
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeExternalUrl('https://exemplo.com')).toBe(true);
  });
});
