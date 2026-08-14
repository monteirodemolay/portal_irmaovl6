/**
 * Normalização/validação centralizada dos links externos da Central dos
 * Irmãos VL6 (docs/architecture) — usada tanto no schema Zod quanto na
 * renderização do botão externo. Sem OAuth/API de terceiros na v1: só
 * campo → normalizar → validar → armazenar → botão (`target="_blank"
 * rel="noopener noreferrer"`). Toda função devolve `null` para entrada
 * vazia/inválida — nunca lança, quem chama decide o tratamento (schema
 * Zod usa `.refine`/`.transform`, UI simplesmente não renderiza o botão).
 */

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

/** Bloqueia `javascript:`/`data:`/`file:` e afins — nunca confiar em URL vinda de formulário sem checar o protocolo. */
export function isSafeExternalUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function validateUrlOnDomain(raw: string, allowedHosts: readonly string[]): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return null;
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (!allowedHosts.includes(host)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Aceita `(64) 99999-9999`, `64999999999` etc. — normaliza pro formato E.164 sem `+` (padrão do wa.me). */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`;
  // DDI(2) + DDD(2) + número(8 ou 9) = 12 a 13 dígitos.
  if (withCountryCode.length < 12 || withCountryCode.length > 13) return null;
  return withCountryCode;
}

export function buildWhatsappLink(normalized: string): string {
  return `https://wa.me/${normalized}`;
}

/** Aceita `@usuario`, `usuario` ou URL completa — normaliza pra `https://instagram.com/usuario`. */
export function normalizeInstagram(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes('://')) {
    return validateUrlOnDomain(trimmed, ['instagram.com']);
  }
  const handle = trimmed.replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{1,30}$/.test(handle)) return null;
  return `https://instagram.com/${handle}`;
}

export function validateFacebookUrl(raw: string): string | null {
  return validateUrlOnDomain(raw, ['facebook.com', 'fb.com']);
}

export function validateLinkedInUrl(raw: string): string | null {
  return validateUrlOnDomain(raw, ['linkedin.com']);
}

export function validateLattesUrl(raw: string): string | null {
  return validateUrlOnDomain(raw, ['lattes.cnpq.br']);
}

/** Site/portfólio genérico — só exige HTTPS e protocolo seguro, sem domínio fixo. */
export function validateWebsiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}
