# 5. Catálogo de Componentes Reutilizáveis

Todos vivem em `apps/web/src/components` (genéricos, sem conhecimento de
módulo de negócio) ou dentro de `apps/web/src/modules/<modulo>/components`
(específicos de domínio, compostos a partir dos genéricos).

## 5.1 Primitivos (`components/ui`) — base Shadcn customizada com os tokens da doc 09

`Button`, `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Switch`,
`Badge`, `Avatar`, `Tooltip`, `Popover`, `DropdownMenu`, `Accordion`,
`Skeleton`, `Separator`, `Toast`.

> Nem todo primitivo listado neste catálogo está implementado — é um
> catálogo de referência, não um inventário exaustivo do que existe hoje em
> `packages/ui`. `Tabs` (acessível, `role="tablist"`/`"tab"`/`"tabpanel"`,
> navegação por seta/Home/End) **é real** — `packages/ui/src/components/tabs.tsx`,
> usado em `/perfil` para separar "Meu Cadastro" de "Central VL6". `Checkbox`,
> `RadioGroup`, `Switch`, `Tooltip`, `Popover`, `DropdownMenu`, `Accordion`,
> `Skeleton`, `Separator` e `Toast` ainda não existem — formulários usam
> `<input type="checkbox">` nativo estilizado onde precisam de um toggle.

## 5.2 Layout (`components/layout`)

| Componente                      | Responsabilidade                                                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `AppSidebar`                    | Navegação lateral, itens dirigidos por RBAC + `modulosHabilitados` do tenant                                                                                                                                                                           |
| `AppHeader`                     | Busca global, seletor de tema, `NotificationCenter`, menu do usuário                                                                                                                                                                                   |
| `AppFooter`                     | Rodapé institucional configurável (`FooterConfig` do tenant)                                                                                                                                                                                           |
| `Breadcrumb`                    | **Não implementado** — não é requisito hoje; `topbarLeft` de `admin/layout.tsx` é estático, não uma trilha dinâmica                                                                                                                                    |
| `TabNav`                        | **Real** — barra de abas horizontal dentro de uma área admin consolidada (`/admin/pessoas`, `/admin/conteudo`, `/admin/acervo`, `/admin/configuracoes`); `apps/web/src/components/layout/tab-nav.tsx` + `area-tabs.ts` (fonte única das abas por área) |
| `PublicHeader` / `PublicFooter` | Variante do site público (não logado)                                                                                                                                                                                                                  |

## 5.3 Exibição de dados (`components/data-display`)

| Componente          | Responsabilidade                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------- |
| `DataTable`         | Tabela genérica (TanStack Table por baixo): ordenação, seleção, ações em massa, estado vazio, densidade |
| `Card` / `StatCard` | Cartão de conteúdo / cartão de métrica para dashboards                                                  |
| `Timeline`          | Linha do tempo (histórico de cargos, auditoria)                                                         |
| `Charts`            | Wrapper fino sobre biblioteca de gráficos (barras, linha, pizza) para dashboards                        |
| `Pagination`        | Paginação client-side e cursor-based (server)                                                           |
| `EmptyState`        | Estado vazio padronizado com ilustração + call-to-action                                                |

## 5.4 Feedback (`components/feedback`)

| Componente           | Responsabilidade                                       |
| -------------------- | ------------------------------------------------------ |
| `Modal`              | Diálogo modal (confirmação, formulário curto)          |
| `Drawer`             | Painel lateral (detalhe de registro, formulário longo) |
| `NotificationCenter` | Sino de notificações, lista + marcar como lida         |
| `ConfirmDialog`      | Confirmação de ações destrutivas (soft delete)         |

## 5.5 Formulários (`components/forms`)

| Componente                       | Responsabilidade                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------- |
| `FormField`                      | Wrapper de `react-hook-form` + label + erro + descrição, único ponto de estilo de campo |
| `DatePicker` / `DateRangePicker` | Seleção de datas (agenda, filtros)                                                      |
| `FileUploader`                   | Upload com progresso, preview, drag-and-drop → Vercel Blob                              |
| `RichTextEditor`                 | Editor WYSIWYG para Notícias/Páginas institucionais                                     |
| `SearchInput`                    | Campo de busca com debounce                                                             |
| `ImageCropper`                   | Recorte de foto de perfil / brasão / logotipo                                           |

## 5.6 Específicos de domínio (exemplos por módulo)

- `membership`: `MemberForm`, `MemberCard`, `MemberSearchFilters`, `MemberPositionTimeline`
- `governance`: `BoardTermForm`, `BoardOrgChart` (organograma da diretoria), `CommitteeForm`
- `library` / `document-management`: `FileUploaderCard`, `FileGrid`, `CategoryTree`
- `agenda`: `EventCalendar`, `EventForm`, `AttendanceConfirmationButton`
- `content`: `NewsEditorForm`, `AnnouncementBanner`
- `gallery`: `AlbumGrid`, `MediaLightbox`
- `identity-access`: `LoginForm`, `RoleAssignmentTable`, `PermissionMatrixEditor`
- `audit`: `AuditLogViewer`, `DiffViewer` (antes/depois)

## 5.7 Regras de composição

1. Componente de módulo nunca acessa Firestore diretamente — só via hooks do
   próprio módulo (`useMembers`, `useEvents`...), que por sua vez chamam
   Server Actions/casos de uso.
2. Nenhum componente recebe cor, texto institucional ou nome de Loja via
   prop hardcoded — vem de contexto (`useTenantBranding`).
3. Toda tabela de listagem usa `DataTable` — proibido reimplementar tabela
   ad-hoc em um módulo.
4. Todo formulário usa `FormField` + schema Zod do `packages/shared` — nunca
   validação manual duplicada entre client/server.
