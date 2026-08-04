/**
 * Formato mínimo de branding que este pacote entende — deliberadamente não
 * importa `TenantBranding` de `@vl6/domain` (packages/ui não depende do
 * domínio, só de `shared`, ver eslint-plugin-boundaries em
 * packages/config/eslint). Quem chama (apps/web) é responsável por adaptar
 * a entidade do domínio para este shape.
 */
export interface BrandingTokensInput {
  corPrimaria: string;
  corSecundaria: string;
  corDestaque: string;
  corFundo: string;
  raioBorda: number;
}

/**
 * Converte o branding de um tenant nas CSS custom properties consumidas
 * pelo preset Tailwind (`packages/config/tailwind/preset.ts`). É assim que
 * a identidade visual de cada Loja é 100% dado, nunca código — ver
 * docs/architecture/09-design-system.md §9.2.
 */
export function brandingToCssVariables(branding: BrandingTokensInput): Record<string, string> {
  return {
    '--color-primary': hexToHslTriplet(branding.corPrimaria),
    '--color-primary-dark': hexToHslTriplet(branding.corSecundaria),
    '--color-accent': hexToHslTriplet(branding.corDestaque),
    '--color-bg': hexToHslTriplet(branding.corFundo),
    '--radius': `${branding.raioBorda}px`,
  };
}

export function cssVariablesToStyleString(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([key, value]) => `${key}: ${value};`)
    .join(' ');
}

/** Tailwind consome cor como tripla HSL (`h s% l%`) para suportar opacidade via `<alpha-value>`. */
function hexToHslTriplet(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `${h} ${s}% ${l}%`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const normalized = hex.replace('#', '');
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: Math.round(l * 100) };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
