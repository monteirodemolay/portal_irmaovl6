# 9. Design System

## 9.1 Direção visual

Institucional moderno — referências: Notion, Linear, Google Workspace,
Microsoft 365, ClickUp, Discord. Sem skeuomorfismo, sem gradientes pesados,
sem excesso de dourado (o dourado é **destaque**, não cor de fundo).
Interfaces densas de dados (tabelas administrativas) priorizam clareza sobre
decoração; páginas públicas/institucionais podem respirar mais.

## 9.2 Tokens de cor (base — Loja Verdadeira Luz nº 06)

Todo token abaixo é **dado configurável por tenant** (`TenantBranding`),
nunca uma constante de código. Os valores a seguir são o *seed* padrão.

```css
:root {
  --color-primary: #061C36;      /* Azul Principal */
  --color-primary-dark: #041223; /* Azul Escuro */
  --color-accent: #D4AF37;       /* Dourado — uso em destaques, não em fundo de tela */
  --color-white: #FFFFFF;
  --color-gray-50: #F5F7FA;      /* Cinza Claro — fundo de página */
  --color-gray-300: #D9D9D9;     /* Cinza Médio — bordas, divisores */

  --radius: 16px;                 /* raio de borda padrão do sistema */
  --shadow-sm: 0 1px 2px rgba(4, 18, 35, 0.06);
  --shadow-md: 0 4px 12px rgba(4, 18, 35, 0.08);
}

[data-theme='dark'] {
  --color-bg: var(--color-primary-dark);
  --color-surface: #0B2544;
  --color-text: #F5F7FA;
  --color-border: #1C3A5E;
  /* --color-accent permanece o mesmo — dourado funciona em ambos os temas */
}

[data-theme='light'] {
  --color-bg: var(--color-gray-50);
  --color-surface: #FFFFFF;
  --color-text: var(--color-primary-dark);
  --color-border: var(--color-gray-300);
}
```

Esses tokens são materializados como **CSS variables geradas em runtime** a
partir do `TenantBranding` carregado no layout raiz (`apps/web/src/app/layout.tsx`),
e consumidos pelo `tailwind.config.ts` via `hsl(var(--...))` — trocar a
identidade visual de uma Loja é **exclusivamente** uma alteração de dado no
Firestore, nunca de código ou redeploy.

## 9.3 Tipografia

- Família: fonte sem serifa geométrica/humanista moderna (ex.: Inter ou
  equivalente), carregada via `next/font` (self-hosted, sem CDN externo).
- Escala tipográfica modular (1.25): `text-xs` (12px) → `text-5xl` (48px).
- Pesos: 400 (corpo), 500 (labels/ênfase), 600–700 (títulos).

## 9.4 Espaçamento e grid

- Escala de espaçamento em múltiplos de 4px (Tailwind default estendido: 4,
  8, 12, 16, 24, 32, 48, 64).
- Grid de conteúdo: `max-w-screen-2xl`, colunas responsivas 1→2→3→4 conforme
  breakpoint, usado consistentemente em listagens (DataTable/Card grids).

## 9.5 Elevação e bordas

- Raio de borda único do sistema: **16px** em cards, modais, inputs grandes;
  **8px** em elementos pequenos (badges, botões compactos) — exceção
  documentada, não improviso.
- Sombras discretas (`--shadow-sm`/`--shadow-md`) — nunca sombras duras ou
  coloridas.

## 9.6 Ícones

Lucide Icons exclusivamente, tamanho padrão 20px em UI densa e 24px em
destaques, `stroke-width: 1.75` padronizado via wrapper `packages/ui/src/icons`.

## 9.7 Dark Mode

- Implementado via atributo `data-theme` na tag `<html>`, persistido em
  cookie (evita FOUC), com `prefers-color-scheme` como padrão inicial.
- Todo componente do design system é testado nos dois temas antes de entrar
  no catálogo — não é um modo "de segunda classe".

## 9.8 Estados e acessibilidade

- Contraste mínimo AA (WCAG 2.1) validado nos tokens de texto/fundo em ambos
  os temas.
- Todo componente interativo tem estado de `:focus-visible` com contorno
  usando `--color-accent`.
- Componentes Shadcn já trazem semântica ARIA correta — customização de
  tema não remove esses atributos.

## 9.9 Motion

Transições curtas (150–200ms, easing `ease-out`) em hover/abertura de
modais/drawers. Sem animações decorativas que atrasem a percepção de
performance.
