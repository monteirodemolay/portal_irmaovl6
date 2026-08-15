# Portal do Irmão VL6

Plataforma oficial da Loja Maçônica Verdadeira Luz nº 06 — projetada desde o
início como um produto multi-tenant, para futuramente atender outras Lojas
sem alteração de código.

A arquitetura completa (visão geral, modelo de dados, RBAC, design system,
roadmap de versões) está documentada em [`docs/architecture`](./docs/architecture/00-README.md).
Este README cobre apenas como rodar o que já existe no repositório.

## Estado atual

Monorepo em Clean Architecture (domínio, infraestrutura e app separados),
multi-tenant, com autenticação completa (login, sessão, Custom Claims, MFA)
e os módulos de negócio da área do Irmão e do painel administrativo já
implementados e funcionando contra Firestore real: Dashboard, Perfil,
Agenda, Arquivos, Biblioteca, Avisos, Downloads, Galeria, Notícias, Links
Úteis, além do `/admin` completo (Irmãos — incluindo importação em massa
por planilha `.xlsx` ou relatório `.pdf` de outro sistema, com tela de
revisão/seleção antes de gravar —, Usuários, Permissões, Arquivos,
Biblioteca, Agenda, Avisos, Notícias, Galeria, Gestões, Loja, Configurações,
Integrações) e do painel `/plataforma` para o Administrador Geral
(multi-tenant cross-tenant). O cadastro de um Irmão não exige e-mail: quem
foi importado sem e-mail cria o próprio acesso sozinho em `/reivindicar`
(escolhe o nome numa lista e confirma o CIM), sem depender do
Administrador. Detalhes de cada módulo e o histórico de versões estão no
[roadmap](./docs/architecture/10-roadmap.md).

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind CSS · Firebase (Auth,
Firestore) · Vercel Blob (upload de arquivos/mídia) · Vercel Cron
(`/api/cron/*`, substitui Cloud Functions agendadas — sem plano Blaze) ·
Zod · React Hook Form · TanStack Query · pnpm workspaces + Turborepo.

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

`.env.local` precisa de três seções:

1. **Client SDK** (`NEXT_PUBLIC_FIREBASE_*`) — em Firebase Console → Configurações do projeto → Apps → SDK do Firebase.
2. **Admin SDK** (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) — gere uma chave de conta de serviço em Configurações do projeto → Contas de serviço. Em produção (Cloud Run/App Hosting) deixe em branco e use Application Default Credentials.
3. **Vercel Blob** (`BLOB_READ_WRITE_TOKEN`) — em Vercel → Storage → Blob, crie um Blob Store e copie o token (ou `vercel env pull` num projeto já conectado). **Obrigatório**: sem essa variável, todo upload de Arquivos/Biblioteca/Galeria/foto de Irmão falha.

## Rodando localmente

```bash
# Emuladores do Firebase (Auth + Firestore) — não há emulador de Storage
# porque o storage de binários é o Vercel Blob, não o Firebase Storage.
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
apps/web        Next.js — login, área do Irmão, painel admin e /plataforma
packages/domain Entidades, casos de uso, interfaces de repositório (Clean Architecture)
packages/infra  Implementações Firestore + Vercel Blob dos repositórios/storage do domínio
packages/ui     Design system (tokens + componentes)
packages/shared Enums, schemas Zod e logger compartilhados
packages/config Presets de eslint/tailwind/tsconfig compartilhados
scripts/        Scripts operacionais (seed do tenant inicial, seed do Administrador Geral)
```

Não há `functions/` (Firebase Cloud Functions) neste repositório — o
projeto roda no plano Spark (sem Cloud Functions/Blaze); tarefas antes
pensadas como Functions viraram rotas em `apps/web/src/app/api/cron/*`
acionadas por Vercel Cron (`apps/web/vercel.json`), protegidas por
`CRON_SECRET`.

## Deploy

`apps/web` já está configurado para deploy na Vercel (`apps/web/vercel.json`
define os crons de `/api/cron/*`). `firebase.json` cobre apenas Firestore
(Rules/Indexes) e os emuladores de Auth/Firestore — não há Firebase
Hosting, Storage nem Cloud Functions configurados, pois o storage de
binários é o Vercel Blob (`BLOB_READ_WRITE_TOKEN`) e não há tarefas
agendadas fora do Vercel Cron.
