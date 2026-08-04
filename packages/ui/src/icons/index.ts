// Reexporta Lucide inteiro (tree-shaken pelo bundler) — o único lugar do
// sistema autorizado a importar 'lucide-react' diretamente, garantindo
// tamanho/traço consistentes via `defaultProps` do Icon primitivo do Lucide.
// Ver docs/architecture/09-design-system.md §9.6.
export * from 'lucide-react';

export const ICON_SIZE_DEFAULT = 20;
export const ICON_SIZE_LARGE = 24;
export const ICON_STROKE_WIDTH = 1.75;
