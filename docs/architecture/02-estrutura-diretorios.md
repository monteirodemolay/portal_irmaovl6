# 2. Estrutura Completa de Diretórios

```
portal-irmao-vl6/
├── apps/
│   └── web/                                   # Next.js 15 (App Router)
│       ├── public/
│       │   └── manifest.webmanifest           # PWA
│       ├── src/
│       │   ├── app/                           # Rotas (App Router) — apenas composição, sem lógica de negócio
│       │   │   ├── (public)/                  # Site público
│       │   │   │   ├── page.tsx                       # Home
│       │   │   │   ├── historia/page.tsx
│       │   │   │   ├── nossa-loja/page.tsx
│       │   │   │   ├── historia-maconaria/page.tsx
│       │   │   │   ├── diretoria/page.tsx
│       │   │   │   ├── galeria/page.tsx
│       │   │   │   ├── eventos/page.tsx
│       │   │   │   ├── noticias/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [slug]/page.tsx
│       │   │   │   ├── contato/page.tsx
│       │   │   │   ├── mapa/page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── (auth)/                    # Login, recuperação de senha
│       │   │   │   ├── login/page.tsx
│       │   │   │   ├── recuperar-senha/page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── (member)/                  # Área do Irmão — exige sessão
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── perfil/page.tsx
│       │   │   │   ├── biblioteca/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [itemId]/page.tsx
│       │   │   │   ├── arquivos/page.tsx
│       │   │   │   ├── agenda/page.tsx
│       │   │   │   ├── eventos/[eventId]/page.tsx
│       │   │   │   ├── avisos/page.tsx
│       │   │   │   ├── noticias/[slug]/page.tsx
│       │   │   │   ├── galeria/[albumId]/page.tsx
│       │   │   │   ├── diretoria/page.tsx
│       │   │   │   ├── pesquisa-irmaos/page.tsx
│       │   │   │   ├── comissoes/page.tsx
│       │   │   │   ├── links-uteis/page.tsx
│       │   │   │   ├── downloads/page.tsx
│       │   │   │   ├── configuracoes/page.tsx
│       │   │   │   └── layout.tsx              # Sidebar + Header da área logada
│       │   │   ├── (admin)/                    # Painel Administrativo — exige RBAC admin
│       │   │   │   ├── dashboard/page.tsx
│       │   │   │   ├── loja/page.tsx                    # Gestão da Loja / branding
│       │   │   │   ├── irmaos/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── novo/page.tsx
│       │   │   │   │   └── [memberId]/page.tsx
│       │   │   │   ├── gestoes/
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   └── [termId]/page.tsx
│       │   │   │   ├── diretoria/page.tsx
│       │   │   │   ├── comissoes/page.tsx
│       │   │   │   ├── agenda/page.tsx
│       │   │   │   ├── eventos/page.tsx
│       │   │   │   ├── arquivos/page.tsx
│       │   │   │   ├── biblioteca/page.tsx
│       │   │   │   ├── galeria/page.tsx
│       │   │   │   ├── avisos/page.tsx
│       │   │   │   ├── noticias/page.tsx
│       │   │   │   ├── usuarios/page.tsx
│       │   │   │   ├── permissoes/page.tsx
│       │   │   │   ├── logs/page.tsx
│       │   │   │   ├── auditoria/page.tsx
│       │   │   │   ├── configuracoes/page.tsx
│       │   │   │   └── layout.tsx
│       │   │   ├── api/                        # Route Handlers = API REST
│       │   │   │   ├── v1/
│       │   │   │   │   ├── auth/
│       │   │   │   │   │   ├── login/route.ts
│       │   │   │   │   │   ├── refresh/route.ts
│       │   │   │   │   │   └── logout/route.ts
│       │   │   │   │   ├── members/route.ts
│       │   │   │   │   ├── members/[id]/route.ts
│       │   │   │   │   ├── files/route.ts
│       │   │   │   │   ├── events/route.ts
│       │   │   │   │   ├── news/route.ts
│       │   │   │   │   ├── announcements/route.ts
│       │   │   │   │   └── openapi.json/route.ts        # Documento OpenAPI gerado
│       │   │   │   └── webhooks/
│       │   │   │       └── storage/route.ts              # callbacks de processamento assíncrono
│       │   │   ├── layout.tsx                   # Layout raiz: carrega TenantBranding, ThemeProvider
│       │   │   ├── manifest.ts                   # PWA manifest dinâmico por tenant
│       │   │   └── globals.css
│       │   ├── modules/                          # Camada de apresentação por módulo (DDD espelhado)
│       │   │   ├── tenancy/
│       │   │   │   ├── components/
│       │   │   │   ├── hooks/                      # useTenantBranding, useTenantSettings (TanStack Query)
│       │   │   │   └── actions/                    # Server Actions do módulo
│       │   │   ├── identity-access/
│       │   │   │   ├── components/                 # LoginForm, MfaPrompt
│       │   │   │   ├── hooks/                       # useSession, usePermissions
│       │   │   │   └── actions/
│       │   │   ├── membership/
│       │   │   │   ├── components/                 # MemberForm, MemberCard, MemberSearchFilters
│       │   │   │   ├── hooks/                       # useMembers, useMember
│       │   │   │   └── actions/
│       │   │   ├── governance/
│       │   │   ├── library/
│       │   │   ├── document-management/
│       │   │   ├── agenda/
│       │   │   ├── content/                          # news + announcements
│       │   │   ├── gallery/
│       │   │   ├── audit/
│       │   │   └── notification/
│       │   ├── components/                            # Componentes GENÉRICOS de UI (não específicos de módulo)
│       │   │   ├── ui/                                 # Primitivos Shadcn (button, input, dialog, table…)
│       │   │   ├── layout/                             # Sidebar, Header, Footer, Breadcrumb
│       │   │   ├── data-display/                       # DataTable, Card, Timeline, Charts
│       │   │   ├── feedback/                            # Modal, Drawer, NotificationCenter, Toast
│       │   │   └── forms/                               # FormField wrappers com RHF+Zod
│       │   ├── lib/
│       │   │   ├── firebase/                             # client.ts, admin.ts (server-only)
│       │   │   ├── query-client.ts                        # TanStack Query provider config
│       │   │   ├── auth/                                   # session helpers, middleware guards
│       │   │   └── api/                                    # fetch client tipado para a API REST
│       │   ├── middleware.ts                                # resolução de tenant por domínio + guarda de rotas
│       │   └── styles/
│       │       └── tokens.css                                # CSS variables geradas do design system
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── package.json
│
├── packages/
│   ├── domain/                                    # Núcleo — Clean Architecture / DDD (zero deps de framework)
│   │   └── src/
│   │       ├── shared/
│   │       │   ├── base-entity.ts                    # BaseEntity (id, tenantId, createdAt...)
│   │       │   ├── result.ts                          # Result<T, E> para tratamento de erro sem exceptions
│   │       │   ├── pagination.ts
│   │       │   └── errors/
│   │       └── modules/
│   │           ├── tenancy/
│   │           │   ├── entities/                        # Tenant, TenantBranding, TenantSettings
│   │           │   ├── repositories/                     # ITenantRepository (interface)
│   │           │   └── use-cases/                        # CreateTenant, UpdateTenantBranding...
│   │           ├── identity-access/
│   │           │   ├── entities/                          # User, Role, Permission
│   │           │   ├── repositories/                       # IUserRepository, IRoleRepository
│   │           │   └── use-cases/                          # AuthenticateUser, AssignRole, CheckPermission
│   │           ├── membership/
│   │           │   ├── entities/                            # Member, MemberPositionHistory
│   │           │   ├── repositories/                         # IMemberRepository
│   │           │   └── use-cases/                            # RegisterMember, UpdateMemberSituation, SearchMembers
│   │           ├── governance/                                # BoardTerm, Committee + use-cases
│   │           ├── library/                                    # LibraryItem, LibraryCategory + use-cases
│   │           ├── document-management/                         # FileAsset, FileCategory + use-cases
│   │           ├── agenda/                                       # Event, EventAttendance + use-cases
│   │           ├── content/                                       # News, Announcement + use-cases
│   │           ├── gallery/                                       # GalleryAlbum, GalleryMedia + use-cases
│   │           ├── audit/                                          # AuditLog + RecordAuditEntry use-case
│   │           └── notification/                                   # Notification + Dispatch use-cases
│   │
│   ├── infra/                                       # Implementações concretas dos repositórios (Firestore/Storage)
│   │   └── src/
│   │       ├── firestore/
│   │       │   ├── client.ts / admin.ts
│   │       │   ├── converters/                          # FirestoreDataConverter por entidade
│   │       │   └── repositories/                          # TenantRepository, MemberRepository... (implementam packages/domain)
│   │       ├── vercel/
│   │       │   └── blob-storage-adapter.ts               # Vercel Blob — ver doc 01, decisão de trocar o Firebase Storage
│   │       └── mappers/
│   │
│   ├── ui/                                          # Design System
│   │   └── src/
│   │       ├── tokens/                                  # colors.ts, spacing.ts, radius.ts, typography.ts
│   │       ├── components/                               # versão "fonte" dos componentes Shadcn customizados
│   │       └── icons/                                      # wrapper de Lucide com tamanhos padronizados
│   │
│   ├── shared/                                     # Tipos e utilitários puros compartilhados entre apps/functions
│   │   └── src/
│   │       ├── enums/                                  # Role, Permission, MemberSituation, Degree...
│   │       ├── schemas/                                 # Zod schemas compartilhados (client+server+functions)
│   │       └── utils/
│   │
│   └── config/                                     # Presets compartilhados
│       ├── eslint/
│       ├── tsconfig/
│       └── tailwind/
│
├── docs/
│   ├── architecture/                              # este diretório
│   └── openapi/
│       └── openapi.yaml
│
├── firestore.rules
├── firestore.indexes.json
├── firebase.json
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .eslintrc.cjs → extends packages/config/eslint
├── .prettierrc
├── .husky/
│   ├── pre-commit                                  # lint-staged
│   └── pre-push                                    # test
└── README.md
```

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
