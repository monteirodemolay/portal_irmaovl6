# 2. Estrutura Completa de Diretórios

> Árvore real do repositório (não mais o desenho de planejamento pré-código
> — este documento foi reescrito para refletir `apps/web/src/app` e os
> pacotes como existem hoje). Detalhes de cada rota/regra ficam nas docs
> 03–10; aqui é só "onde cada coisa mora".

```
portal_irmaovl6/
├── apps/
│   └── web/                                   # Next.js 15 (App Router)
│       ├── public/
│       │   └── manifest.webmanifest           # PWA (ver também app/manifest.ts, dinâmico por tenant)
│       ├── src/
│       │   ├── app/                           # Rotas (App Router) — composição + guards, sem regra de negócio
│       │   │   ├── (auth)/                    # Públicas — únicas exceções de PROTECTED_PREFIXES (doc 07 §7.0)
│       │   │   │   ├── login/page.tsx                 # Login unificado (todo domínio/subdomínio) + recuperação de senha
│       │   │   │   └── reivindicar/page.tsx           # Autorreivindicação de acesso (doc 07 §7.2b)
│       │   │   ├── (member)/                   # Área do Irmão — exige sessão
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── irmaos/                          # Diretório + "Meu Espaço" (unifica os antigos /perfil e /central)
│       │   │   │   │   ├── page.tsx                            # Diretório (busca/filtros)
│       │   │   │   │   ├── meu-espaco/page.tsx                  # Autoatendimento (abas: Meu Cadastro / Central VL6)
│       │   │   │   │   ├── [memberId]/page.tsx                  # Perfil público de outro Irmão
│       │   │   │   │   └── layout.tsx
│       │   │   │   ├── biblioteca/page.tsx
│       │   │   │   ├── arquivos/page.tsx
│       │   │   │   ├── agenda/page.tsx
│       │   │   │   ├── eventos/[eventId]/page.tsx
│       │   │   │   ├── avisos/page.tsx
│       │   │   │   ├── noticias/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [slug]/page.tsx
│       │   │   │   ├── galeria/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [albumId]/page.tsx
│       │   │   │   ├── links-uteis/page.tsx
│       │   │   │   ├── downloads/page.tsx
│       │   │   │   └── layout.tsx              # Sidebar + Header da área logada
│       │   │   ├── admin/                       # Painel Administrativo — exige RBAC admin; 4 áreas com abas (TabNav, doc 05)
│       │   │   │   ├── page.tsx                          # Visão geral (números reais das 4 áreas)
│       │   │   │   ├── pessoas/                          # Pessoas & Loja
│       │   │   │   │   ├── irmaos/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── novo/page.tsx
│       │   │   │   │   │   ├── importar/page.tsx                 # Wizard de importação .xlsx/.pdf (doc 06 §6.1)
│       │   │   │   │   │   └── [memberId]/page.tsx
│       │   │   │   │   ├── usuarios/page.tsx
│       │   │   │   │   ├── permissoes/page.tsx
│       │   │   │   │   ├── gestoes/
│       │   │   │   │   │   ├── page.tsx
│       │   │   │   │   │   ├── nova/page.tsx
│       │   │   │   │   │   └── [termId]/page.tsx
│       │   │   │   │   ├── loja/page.tsx                          # Gestão da Loja / branding
│       │   │   │   │   ├── central/page.tsx                        # Moderação do módulo Central (doc 01 §1.5)
│       │   │   │   │   └── layout.tsx
│       │   │   │   ├── conteudo/                          # Notícias, Avisos, Agenda
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── noticias/{page.tsx, nova/page.tsx, [newsId]/page.tsx}
│       │   │   │   │   ├── avisos/{page.tsx, novo/page.tsx}
│       │   │   │   │   ├── agenda/{page.tsx, novo/page.tsx, [eventId]/page.tsx}
│       │   │   │   │   └── layout.tsx
│       │   │   │   ├── acervo/                            # Arquivos, Biblioteca, Galeria
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── arquivos/{page.tsx, novo/page.tsx}
│       │   │   │   │   ├── biblioteca/{page.tsx, novo/page.tsx}
│       │   │   │   │   ├── galeria/{page.tsx, novo/page.tsx, [albumId]/page.tsx}
│       │   │   │   │   └── layout.tsx
│       │   │   │   ├── configuracoes/                     # Geral, Integrações
│       │   │   │   │   ├── geral/page.tsx
│       │   │   │   │   ├── integracoes/page.tsx           # Emissão de API Keys (doc 07 §7.9)
│       │   │   │   │   └── layout.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── plataforma/                   # Administrador Geral (cross-tenant, doc 01 §1.6/doc 07 §7.2)
│       │   │   │   ├── page.tsx
│       │   │   │   ├── lojas/nova/page.tsx               # Onboarding de novo tenant
│       │   │   │   └── layout.tsx
│       │   │   ├── api/                          # Route Handlers
│       │   │   │   ├── v1/
│       │   │   │   │   ├── auth/{login,logout}/route.ts
│       │   │   │   │   ├── members/route.ts                     # autenticado por API Key (doc 07 §7.9)
│       │   │   │   │   ├── admin/members/export/route.ts        # CSV/XLSX (base da importação, doc 06 §6.1)
│       │   │   │   │   ├── docs/route.ts + docs/assets/[file]/route.ts   # Swagger UI
│       │   │   │   │   ├── openapi.json/route.ts
│       │   │   │   │   └── web-vitals/route.ts
│       │   │   │   ├── agenda/[eventId]/ics/route.ts             # Exportação de evento (.ics)
│       │   │   │   ├── cron/{birthday-reminder,daily-backup}/route.ts   # Vercel Cron, protegidas por CRON_SECRET
│       │   │   │   ├── files/[fileId]/route.ts                   # Proxy autenticado de binário (Vercel Blob)
│       │   │   │   └── library-items/[libraryItemId]/route.ts
│       │   │   ├── layout.tsx                   # Layout raiz: TenantBranding, ThemeProvider, providers.tsx
│       │   │   ├── page.tsx                      # "/" — decide destino por sessão (resolvePostLoginDestination)
│       │   │   ├── manifest.ts                   # PWA manifest dinâmico por tenant
│       │   │   ├── offline/page.tsx               # Fallback do Service Worker — pública, sem rede/sessão
│       │   │   ├── global-error.tsx / not-found.tsx
│       │   │   └── providers.tsx
│       │   ├── modules/                          # Camada de apresentação por módulo (DDD espelhado)
│       │   │   ├── tenancy/{actions,components}
│       │   │   ├── identity-access/{actions,components}         # LoginForm, ClaimAccountForm...
│       │   │   ├── membership/{actions,components,lib}          # MemberForm, ImportMembersForm (wizard)...
│       │   │   ├── central/{actions,components,lib}              # Perfil unificado do Irmão (Diretório/Meu Espaço)
│       │   │   ├── dashboard/{components,lib}
│       │   │   ├── governance/{actions,components}
│       │   │   ├── library/{actions,components}
│       │   │   ├── document-management/{actions,components}
│       │   │   ├── agenda/{actions,components}
│       │   │   ├── content/{actions,components}                  # news + announcements
│       │   │   ├── gallery/{actions,components}
│       │   │   └── notification/{actions,components}
│       │   ├── components/                            # Componentes GENÉRICOS de app (não específicos de módulo)
│       │   │   ├── layout/                             # AppShell, TabNav/AreaTabNav, SidebarBrand, TopbarUser, nav-items
│       │   │   ├── forms/                               # FormField, FormSectionCard
│       │   │   ├── admin/                               # PublishToggleButton, SoftDeleteButton
│       │   │   ├── member/                              # AcervoPageHeader, RecordingLink
│       │   │   └── membership/                          # MemberAvatar, MemberDegreeBadge
│       │   ├── lib/
│       │   │   ├── firebase/client.ts                    # Admin SDK fica em packages/infra, não aqui
│       │   │   ├── auth/                                   # require-session, require-permission, build-auth-context...
│       │   │   ├── tenant/get-current-tenant.ts
│       │   │   ├── api/                                    # rate-limiter, get-client-ip, resolve-api-key-context...
│       │   │   ├── i18n/dictionaries/                       # doc 01 §1.7 — mecanismo real, cobertura parcial da UI
│       │   │   ├── membership/, observability/, openapi/, pwa/
│       │   ├── middleware.ts                                # resolução de tenant por domínio + guarda de rotas
│       │   └── styles/ (globals.css — tokens vêm de packages/ui, ver doc 09)
│       ├── next.config.ts
│       ├── vercel.json                                       # crons de /api/cron/*
│       └── package.json
│
├── packages/
│   ├── domain/                                    # Núcleo — Clean Architecture / DDD (zero deps de framework)
│   │   └── src/
│   │       ├── shared/                                # BaseEntity, Result, AuthContext, address, pagination, errors/
│   │       ├── test/fakes.ts                           # Repositórios in-memory usados pelos testes de use-case
│   │       └── modules/
│   │           ├── tenancy/{entities,repositories,services,use-cases}
│   │           ├── identity-access/{entities,repositories,services,use-cases}   # inclui ClaimMemberAccountUseCase
│   │           ├── membership/{entities,repositories,use-cases}                 # Member, MemberPositionHistory
│   │           ├── central/{entities,dtos,repositories,use-cases,lib}           # perfil unificado do Irmão
│   │           ├── governance/{entities,repositories,use-cases}
│   │           ├── library/{entities,repositories,use-cases}
│   │           ├── document-management/{entities,repositories,use-cases}
│   │           ├── agenda/{entities,repositories,use-cases}
│   │           ├── content/{entities,repositories,use-cases}                    # news + announcements
│   │           ├── gallery/{entities,repositories,use-cases}
│   │           ├── audit/{entities,repositories,use-cases}
│   │           └── notification/{entities,repositories,services,use-cases}
│   │
│   ├── infra/                                       # Implementações concretas dos repositórios (Firestore/Vercel Blob)
│   │   └── src/
│   │       ├── firebase/                                # admin.ts (Admin SDK)
│   │       ├── firestore/{converters,repositories}       # implementam as interfaces de packages/domain
│   │       ├── vercel/                                   # blob-storage-adapter.ts
│   │       ├── adapters/, audit/, dns/, security/
│   │       └── container.ts                               # DI: monta use-cases + repositórios (createServerContainer)
│   │
│   ├── ui/                                          # Design System — fonte real dos primitivos (não Shadcn "copiado")
│   │   └── src/
│   │       ├── tokens/                                  # colors.ts, radius.ts, typography.ts, apply-branding.ts
│   │       ├── components/                               # Button, Input, Textarea, Select, Label, Card, Badge,
│   │       │                                              # Avatar, Dialog, Tabs, Switch, DataTable, EmptyState
│   │       └── icons/ (reexport nomeado de Lucide — evita colisão de nomes)
│   │
│   ├── shared/                                     # Tipos e utilitários puros compartilhados
│   │   └── src/
│   │       ├── enums/                                  # RoleKey, PermissionKey, MemberSituation, MemberDegree...
│   │       ├── schemas/                                 # Zod schemas compartilhados (client+server)
│   │       ├── calendar/, central/, observability/
│   │
│   └── config/                                     # Presets compartilhados
│       ├── eslint/                                     # inclui eslint-plugin-boundaries (§2.1)
│       ├── tsconfig/
│       └── tailwind/
│
├── scripts/                                       # seed-tenant, seed do Administrador Geral (operacional, fora do app)
├── docs/
│   ├── architecture/                              # este diretório
│   └── openapi/openapi.yaml
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json                                  # só Firestore (Rules/Indexes) + emuladores — sem Hosting/Storage/Functions
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── eslint.config.js → extends packages/config/eslint
├── .prettierrc
├── .husky/
│   ├── pre-commit                                  # lint-staged
│   └── pre-push                                    # test
└── README.md
```

Não existe `functions/` (Firebase Cloud Functions) — o projeto roda no
plano Spark; tarefas antes pensadas como Functions viraram rotas em
`api/cron/*` acionadas por Vercel Cron (doc 01 §1.3). Não existe mais
grupo de rotas `(public)` nem site institucional dentro do Portal — ver
doc 07 §7.0.

## 2.1 Regras de dependência entre camadas (impostas por lint, não só convenção)

```
presentation (apps/web)  ──depends on──►  application/use-cases (packages/domain)
application/use-cases    ──depends on──►  domain entities + repository INTERFACES (packages/domain)
infra (packages/infra)   ──implements──►  repository interfaces (packages/domain)
domain (packages/domain) ──depends on──►  NADA externo (sem Next.js, sem Firebase, sem React)
```

Um plugin de ESLint (`eslint-plugin-boundaries`) é configurado em
`packages/config/eslint` para **falhar o build** caso `packages/domain` importe
qualquer coisa de `packages/infra` ou `apps/web`. Isso é o que garante, na
prática, que a arquitetura não degrade com o tempo.

## 2.2 Convenção de nomenclatura

| Item                      | Convenção                   | Exemplo                 |
| ------------------------- | --------------------------- | ----------------------- |
| Pastas                    | kebab-case                  | `document-management/`  |
| Componentes React         | PascalCase                  | `MemberCard.tsx`        |
| Hooks                     | camelCase com prefixo `use` | `useMembers.ts`         |
| Casos de uso              | PascalCase + verbo          | `RegisterMember.ts`     |
| Interfaces de repositório | prefixo `I`                 | `IMemberRepository.ts`  |
| Coleções Firestore        | camelCase plural            | `memberPositionHistory` |
| Rotas de API              | kebab-case, versionadas     | `/api/v1/members`       |
