# 9. Design System

## 9.1 Direção visual

Institucional moderno — referências: Notion, Linear, Google Workspace,
Microsoft 365, ClickUp, Discord. Sem skeuomorfismo, sem gradientes pesados,
sem excesso de dourado (o dourado é **destaque**, não cor de fundo).
Interfaces densas de dados (tabelas administrativas) priorizam clareza sobre
decoração; páginas públicas/institucionais podem respirar mais.

## 9.2 Tokens de cor (base — Loja Verdadeira Luz nº 06)

Todo token abaixo é **dado configurável por tenant** (`TenantBranding`),
nunca uma constante de código. Os valores a seguir são o _seed_ padrão.

```css
:root {
  --color-primary: #061c36; /* Azul Principal */
  --color-primary-dark: #041223; /* Azul Escuro */
  --color-accent: #d4af37; /* Dourado — uso em destaques, não em fundo de tela */
  --color-white: #ffffff;
  --color-gray-50: #f5f7fa; /* Cinza Claro — fundo de página */
  --color-gray-300: #d9d9d9; /* Cinza Médio — bordas, divisores */

  --radius: 16px; /* raio de borda padrão do sistema */
  --shadow-sm: 0 1px 2px rgba(4, 18, 35, 0.06);
  --shadow-md: 0 4px 12px rgba(4, 18, 35, 0.08);
}

[data-theme='dark'] {
  --color-bg: var(--color-primary-dark);
  --color-surface: #0b2544;
  --color-text: #f5f7fa;
  --color-border: #1c3a5e;
  /* --color-accent permanece o mesmo — dourado funciona em ambos os temas */
}

[data-theme='light'] {
  --color-bg: var(--color-gray-50);
  --color-surface: #ffffff;
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

## 9.10 Padrão de Relatórios

Todo relatório do site segue o mesmo fluxo em 2 telas, implementado pela
primeira vez no Relatório de Irmãos
(`/admin/pessoas/irmaos/relatorio`) — referência pra qualquer relatório
futuro:

1. **Configurar** — os mesmos filtros já usados na listagem de origem +
   checkboxes pra escolher quais colunas entram no relatório (com um
   conjunto padrão pré-marcado).
2. **Prévia** — o documento como vai sair (cabeçalho com nome da Loja,
   filtros aplicados, data de geração e total de registros + tabela),
   com uma barra de ações: **Imprimir** (impressão nativa do navegador,
   `window.print()`), e baixar em **PDF, Word, Excel ou CSV**.

Implementação técnica (reaproveitável 1:1 por qualquer relatório novo):

- **Uma rota só**, sem sub-rotas por etapa — mesmo padrão de wizard já
  usado pela importação em massa de Irmãos
  (`ImportMembersForm`/`import-members-form.tsx`): a fase é derivada de
  qual `useActionState` já tem resultado, e "voltar" é um reset de estado
  local via `key={attempt}` no componente pai, não navegação.
- A tela de configuração é só um `<form action={serverAction}>`
  (uncontrolled) com os filtros + checkboxes de coluna; a Server Action
  correspondente só lê (nunca grava), busca via o mesmo Use Case de busca
  já usado pela listagem, e devolve os dados já formatados pra prévia —
  incluindo a querystring pronta (filtros + colunas) que os 4 links de
  download reaproveitam sem recalcular nada no client.
- As colunas do relatório (chave, rótulo, `getValue(entidade)`) vivem num
  único arquivo compartilhado entre o checkbox picker (client) e a
  geração dos 4 formatos (server) — ver
  `apps/web/src/modules/membership/reports/member-report-columns.ts`.
- Geração de arquivo: Excel e CSV via `exceljs` (mesma worksheet, dois
  writers); PDF via `@react-pdf/renderer` (biblioteca JS pura — sem
  Puppeteer/Chromium, mesma cautela do incidente `pdfjs-dist`/Vercel já
  resolvido neste projeto); Word via a biblioteca `docx`. Nenhuma delas
  depende de binário nativo — importante em ambiente serverless.
- A impressão da prévia usa CSS puro (`print:` do Tailwind, nativo, sem
  plugin) — a sidebar e a topbar do admin já têm `print:hidden` no
  `AppShell` (`apps/web/src/components/layout/app-shell.tsx`), então
  qualquer relatório futuro herda uma impressão limpa de graça.
