# Portal do Irmão VL6

Plataforma oficial da Loja Maçônica Verdadeira Luz nº 06 — projetada desde o
início como um produto multi-tenant, para futuramente atender outras Lojas
sem alteração de código.

A arquitetura completa (visão geral, modelo de dados, RBAC, design system,
roadmap de versões) está documentada em [`docs/architecture`](./docs/architecture/00-README.md).
Este README cobre apenas como rodar o que já existe no repositório.

## Estado atual: v0.1 (Fundação)

Monorepo, camada de domínio (Tenancy + IdentityAccess), infraestrutura
Firestore, design system inicial e o fluxo de autenticação completo (login,
sessão, Custom Claims). Ainda **não há** telas de negócio (Biblioteca,
Arquivos, Agenda etc.) — ver [roadmap](./docs/architecture/10-roadmap.md).

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Firebase (Auth,
Firestore, Storage, Cloud Functions) · Zod · React Hook Form · TanStack
Query · pnpm workspaces + Turborepo.

## Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable` já resolve isso)
- Um projeto Firebase (ou o [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) para desenvolvimento local)

## Setup

```bash
pnpm install

# apps/web precisa das credenciais do Firebase — copie e preencha:
cp apps/web/.env.example apps/web/.env.local
```

`.env.local` precisa de duas seções:

1. **Client SDK** (`NEXT_PUBLIC_FIREBASE_*`) — em Firebase Console → Configurações do projeto → Apps → SDK do Firebase.
2. **Admin SDK** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) — gere uma chave de conta de serviço em Configurações do projeto → Contas de serviço. Em produção (Cloud Run/App Hosting) deixe em branco e use Application Default Credentials.

## Rodando localmente

```bash
# Emuladores do Firebase (Auth + Firestore + Storage + Functions)
firebase emulators:start

# Provisiona o tenant Verdadeira Luz nº 06 + primeiro Administrador
# (contra os emuladores, sem precisar de credenciais — ver scripts/seed-tenant.ts)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
ADMIN_EMAIL=admin@vl6.org.br ADMIN_PASSWORD=troque-esta-senha \
pnpm --filter @vl6/scripts seed-tenant

# App Next.js
pnpm --filter @vl6/web dev
```

Acesse `http://vl6.localhost:3000` (o subdomínio precisa bater com
`Tenant.subdominio` — ver `middleware.ts` e `docs/architecture/07-fluxo-
autenticacao.md §7.1`; em `localhost` puro configure `/etc/hosts` ou acesse
via `127.0.0.1` com um cabeçalho de host customizado durante o
desenvolvimento).

## Comandos do monorepo

```bash
pnpm dev          # turbo run dev (todos os apps)
pnpm build        # turbo run build
pnpm lint         # turbo run lint
pnpm type-check   # turbo run type-check
pnpm test         # turbo run test
pnpm format       # prettier --write .
```

Cada pacote também roda isoladamente: `pnpm --filter @vl6/domain test`,
`pnpm --filter @vl6/web build`, etc.

## Estrutura

Ver a árvore completa e a explicação de cada camada em
[`docs/architecture/02-estrutura-diretorios.md`](./docs/architecture/02-estrutura-diretorios.md).
Resumo:

```
apps/web        Next.js — site público, área do irmão, painel admin
packages/domain Entidades, casos de uso, interfaces de repositório (Clean Architecture)
packages/infra  Implementações Firestore dos repositórios do domínio
packages/ui     Design system (tokens + componentes)
packages/shared Enums e schemas Zod compartilhados
functions/      Firebase Cloud Functions (sync de Custom Claims, etc.)
scripts/        Scripts operacionais (seed do tenant inicial)
```

## Deploy

Ainda não definido neste repositório — ver "Fora de escopo" no
[roadmap](./docs/architecture/10-roadmap.md). `firebase.json` já cobre
Firestore Rules/Indexes, Storage Rules e Cloud Functions; falta decidir o
alvo de deploy do `apps/web` (Firebase App Hosting, Vercel ou Cloud Run).
