# 1. Visão Geral da Arquitetura

## 1.1 Objetivo

O **Portal do Irmão VL6** é uma plataforma corporativa para gestão administrativa,
comunicação, biblioteca digital, arquivos, agenda e site institucional de Lojas
Maçônicas. Nasce atendendo a **Loja Maçônica Verdadeira Luz nº 06**, mas todo o
sistema é desenhado como um produto **multi-tenant** (SaaS-ready) desde a primeira
linha de código, para permitir comercialização futura para outras Lojas sem
reescrita estrutural.

Escala alvo: milhares de usuários simultâneos, centenas de tenants (Lojas),
dezenas de milhares de documentos/arquivos por tenant.

## 1.2 Princípios Arquiteturais

| Princípio | Como é aplicado |
|---|---|
| **Clean Architecture** | Código organizado em camadas (`domain` → `application` → `infrastructure` → `presentation`), com dependências sempre apontando para dentro. O domínio não conhece Next.js, React ou Firebase. |
| **SOLID** | Cada caso de uso tem responsabilidade única; dependências são injetadas via interfaces (repositórios, gateways); extensão por composição, não por modificação. |
| **DDD** | O sistema é dividido em **Bounded Contexts** (módulos de negócio), cada um com sua própria linguagem ubíqua, entidades e regras — ver §1.5. |
| **Repository Pattern** | Toda persistência é acessada por interfaces `I*Repository` definidas no domínio; implementações concretas (Firestore) vivem na infraestrutura e são injetáveis/mocáveis. |
| **Service Layer** | Regras de negócio que orquestram múltiplos repositórios ficam em *application services* (casos de uso), nunca em componentes React ou route handlers. |
| **Componentização** | UI construída com componentes pequenos, tipados, sem lógica de negócio embutida (dumb components) + hooks/containers que conectam com a camada de aplicação. |
| **Escalabilidade** | Modelo de dados desnormalizado onde necessário, paginação obrigatória em listagens, cache via TanStack Query, Cloud Functions para processamento assíncrono (thumbnails, notificações, auditoria), CDN para assets estáticos e mídia. |
| **Segurança** | RBAC completo, Firestore Security Rules como segunda camada de defesa (nunca confiar só no client), auditoria imutável, soft delete, rate limiting na API. |
| **Performance** | Server Components por padrão, Client Components só onde há interatividade, `next/image`, lazy loading, code splitting por módulo/rota. |
| **Organização de código** | Monorepo com pacotes compartilhados versionados, convenções de nomenclatura únicas, lint/format/commit hooks obrigatórios. |

## 1.3 Stack Tecnológica

### Frontend / Aplicação
- **Next.js 15** (App Router, Server Components, Server Actions, Route Handlers)
- **React 19**
- **TypeScript** (strict mode, `noUncheckedIndexedAccess`, sem `any` implícito)
- **Tailwind CSS** (com tema customizado via tokens — ver doc 09)
- **Shadcn UI** (componentes headless copiados para o repo, não uma dependência de runtime)
- **Lucide Icons**
- **React Hook Form** + **Zod** (validação client e server compartilhada)
- **TanStack Query** (cache, revalidação, estado de servidor no client)

### Backend / Dados
- **Firebase Authentication** (e-mail/senha, Google, futura expansão SSO)
- **Firestore** (banco principal, modelagem multi-tenant — ver doc 03)
- **Firebase Storage** (arquivos, mídia, thumbnails)
- **Firebase Cloud Functions** (2nd gen, Node 20) — jobs assíncronos, triggers de auditoria, geração de thumbnails, envio de notificações, webhooks
- **API REST** própria (Next.js Route Handlers) documentada em **OpenAPI 3.1**, autenticada via **JWT + Refresh Token**, com **rate limiting**

### Qualidade / Tooling
- **ESLint** (regras estritas + plugin de import ordering + boundaries entre camadas)
- **Prettier**
- **Husky** + **lint-staged** (pre-commit: lint + format + type-check dos arquivos alterados; pre-push: testes)
- **Vitest** (testes unitários de domínio/aplicação) + **Testing Library** (componentes) + **Playwright** (E2E) — ver roadmap para fase de introdução
- **Turborepo** + **pnpm workspaces** (orquestração do monorepo, cache de build)

## 1.4 Arquitetura Física (Monorepo)

Optamos por **monorepo com pnpm + Turborepo** em vez de um único projeto Next.js
monolítico "achatado". Motivo: o domínio de negócio (entidades, regras, casos de
uso) deve poder ser testado, versionado e potencialmente reutilizado (ex.: em
Cloud Functions, em um futuro app mobile) **sem depender do framework web**.

```
apps/web            → Next.js 15 (site público + área do irmão + painel admin)
packages/domain      → Entidades, value objects, casos de uso, interfaces de repositório (zero deps de framework)
packages/infra       → Implementações Firestore/Storage dos repositórios do domínio
packages/ui          → Design system (componentes Shadcn customizados, tokens, ícones)
packages/config      → Presets compartilhados (eslint, tsconfig, tailwind)
packages/shared      → Utilitários puros, tipos compartilhados (ex.: enums de RBAC)
functions/           → Firebase Cloud Functions (usa packages/domain e packages/infra)
```

Isso é o que torna o produto "vendável": `packages/domain` nunca sabe o que é
um tenant específico, uma cor ou um logotipo — ele só conhece regras de negócio
genéricas parametrizadas por `tenantId`.

## 1.5 Bounded Contexts (Módulos DDD)

| Módulo | Responsabilidade | Entidades principais |
|---|---|---|
| **Tenancy** | Cadastro e configuração de Lojas (tenants), branding, módulos habilitados | `Tenant`, `TenantBranding`, `TenantSettings` |
| **IdentityAccess** | Autenticação, contas de usuário, papéis e permissões (RBAC) | `User`, `Role`, `Permission`, `Session` |
| **Membership** | Cadastro de Irmãos e seu histórico | `Member`, `MemberPositionHistory` |
| **Governance** | Gestões anuais, Diretoria, Comissões | `BoardTerm`, `BoardPositionAssignment`, `Committee` |
| **Library** | Biblioteca digital, categorias, favoritos, leitura | `LibraryItem`, `LibraryCategory`, `LibraryFavorite` |
| **DocumentManagement** | Arquivos compartilhados, categorias, downloads | `FileAsset`, `FileCategory` |
| **Agenda** | Eventos, sessões, cursos, presença | `Event`, `EventAttendance` |
| **Content** | Notícias e Avisos | `News`, `NewsComment`, `Announcement` |
| **Gallery** | Álbuns de fotos e vídeos | `GalleryAlbum`, `GalleryMedia` |
| **Audit** | Trilha de auditoria imutável | `AuditLog` |
| **Notification** | Notificações internas e integrações externas preparadas | `Notification`, `NotificationPreference` |
| **PublicSite** | Conteúdo institucional editável do site público | `PublicPage`, `PublicPageBlock` |

Cada módulo é um diretório autocontido em `packages/domain/src/modules/<modulo>`
e espelhado em `apps/web/src/modules/<modulo>` para a camada de apresentação.
Comunicação entre módulos acontece apenas via interfaces de domínio publicadas
(nunca importando internals de outro módulo) — ver doc 02.

## 1.6 Multi-tenancy — estratégia técnica

- **Modelo:** *pool model* — coleções Firestore compartilhadas (flat), toda
  entidade carrega `tenantId`. Escolhido em vez de "um banco por tenant" porque
  simplifica queries administrativas globais, backups e custo operacional em
  escala inicial (dezenas/centenas de tenants).
- **Resolução de tenant:** por domínio/subdomínio (`vl6.portaldoirmao.app` ou
  domínio próprio configurado em `Tenant.domain`) resolvido em Next.js
  Middleware, que injeta `tenantId` no contexto da requisição.
- **Isolamento:** garantido em duas camadas — (1) toda query de aplicação é
  obrigatoriamente filtrada por `tenantId` (repositórios não expõem métodos sem
  esse filtro); (2) Firestore Security Rules validam `resource.data.tenantId ==
  request.auth.token.tenantId` como última linha de defesa.
- **Evolução futura:** o pool model não impede migrar tenants grandes para
  bancos dedicados depois (ex.: Firestore multi-database), caso um cliente
  exija isolamento físico — decisão adiada para quando houver demanda real.

## 1.7 Decisões que ficam registradas aqui (para não se perderem depois)

1. Idioma do **código** (identificadores, coleções, tipos): inglês.
   Idioma da **interface** (labels, textos institucionais): português, mas
   **configurável por tenant** via tabela de traduções (preparação i18n).
2. Todos os módulos de conteúdo (Notícias, Avisos, Biblioteca, Arquivos,
   Galeria) compartilham um pipeline comum de **publicação** (rascunho →
   publicado → arquivado) definido uma única vez no domínio compartilhado.
3. Nenhuma cor, texto, logotipo ou nome de Loja é hardcoded em nenhum
   componente — tudo vem de `TenantBranding`/`TenantSettings` carregado no
   layout raiz (ver doc 09).
