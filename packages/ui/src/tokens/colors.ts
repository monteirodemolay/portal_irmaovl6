/**
 * Paleta *seed* — usada apenas para provisionar o `TenantBranding` de um
 * tenant novo (ver CreateTenantUseCase / DEFAULT_TENANT_BRANDING em
 * @vl6/shared). Em runtime, as cores efetivas de cada Loja vêm do banco,
 * nunca destas constantes — ver `applyBrandingTokens` em
 * `src/tokens/apply-branding.ts`.
 */
export const SEED_COLORS = {
  primary: '#061C36',
  primaryDark: '#041223',
  accent: '#D4AF37',
  white: '#FFFFFF',
  gray50: '#F5F7FA',
  gray300: '#D9D9D9',
} as const;

export const DARK_THEME_COLORS = {
  bg: SEED_COLORS.primaryDark,
  surface: '#0B2544',
  text: SEED_COLORS.gray50,
  textMuted: '#9FB2CB',
  border: '#1C3A5E',
} as const;

export const LIGHT_THEME_COLORS = {
  bg: SEED_COLORS.gray50,
  surface: SEED_COLORS.white,
  text: SEED_COLORS.primaryDark,
  textMuted: '#4A5C74',
  border: SEED_COLORS.gray300,
} as const;
