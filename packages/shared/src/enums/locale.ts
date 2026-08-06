/**
 * Idiomas suportados para `TenantSettings.idiomaPadrao`
 * (docs/architecture/10-roadmap.md v2.0 — internacionalização real). Cada
 * Loja escolhe um; textos institucionais livres continuam à parte
 * (`TenantSettings.textosInstitucionais`).
 */
export const SUPPORTED_LOCALES = ['pt-BR', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pt-BR';

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
