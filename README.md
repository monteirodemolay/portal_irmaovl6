# Portal do Irmão VL6

Portal autenticado da **Loja Maçônica Verdadeira Luz nº 06**, construído em monorepo multi-tenant (preparado para outras Lojas), com gestão institucional, serviços ao Irmão e preservação da memória da Loja. O site institucional público `www.vl6.com.br` permanece externo (Wix); o Portal opera em `portal.vl6.com.br`.

**Referência técnica atualizada em 28/09/2026:** [Estado implementado e operação](./docs/architecture/13-estado-atual-e-operacao.md) · [Índice de arquitetura](./docs/architecture/00-README.md) · [Acervo VL6](./docs/architecture/11-acervo-vl6.md).

## O que existe no repositório

| Núcleo                  | Funcionalidades e rotas                                                                                                                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade e Loja       | Login Firebase, recuperação de acesso, reivindicação em `/reivindicar`, perfil/diretório de Irmãos, administração de membros, gestões, usuários e papéis RBAC; painel multi-tenant `/plataforma`.               |
| Agenda                  | `/agenda`: sessões, eventos, aniversariantes, paramaçônicas, recessos, compromissos/notas/tarefas pessoais, arquivos iCalendar e integração opcional com Google Calendar por OAuth.                             |
| Conteúdo                | Notícias `/noticias` e `/noticias/todas`, avisos, notificações, administração editorial, destaques, filtros/paginação, importação e reimportação de notícias de `vl6.com.br`.                                   |
| Acervo VL6              | `/acervo`: arquivos, biblioteca física/digital, fotografias, vídeos, documentos, coleções, eventos, gestões, pessoas, exposições, linha do tempo, contribuição/catálogo e experiências de descoberta.           |
| Constelação             | `/acervo/constelacao`: central automática de lembranças por ano; apenas eventos ligados a **fotos ou vídeos publicados e acessíveis**; reprodução automática e `Surpreenda-me`, sem exigir montagem de trilhas. |
| Biblioteca              | Catálogo, capas, exemplares, estantes, tombo/QR, carrinho, empréstimos, avaliações, circulação, devolução e baixas.                                                                                             |
| Comunidade Paramaçônica | `/paramaconicas`, perfis e autorizações específicas, com recorte de dados separado da área privativa dos Irmãos.                                                                                                |
| Termos e Privacidade    | Aceite autenticado, versões, histórico e publicação administrativa com possibilidade de solicitar novo aceite.                                                                                                  |
| Cripta                  | `/cripta` e `/cripta-administracao`: experiência **piloto restrita** para cartas, rascunhos, anexos e Wix privado; a custódia institucional anual e recuperação de chaves **não estão concluídas**.             |

Detalhes, decisões, restrições e próximos trabalhos constam em [13-estado-atual-e-operacao.md](./docs/architecture/13-estado-atual-e-operacao.md). A existência de código não substitui testes autenticados em produção; o histórico do roadmap não deve ser lido como uma lista integral de entregas concluídas.

## Stack e organização

**Next.js 15**, **React 19**, **TypeScript**, **Tailwind CSS**, Firebase **Authentication/Firestore** (SDK de cliente e Admin), **Vercel Blob** (mídias do portal), **Vercel Cron**, **Google Calendar OAuth** e integração **Wix Media** restrita ao piloto da Cripta. Também são utilizados Zod, React Hook Form, TanStack Query, Vitest, Playwright, pnpm e Turborepo.

```text
apps/web         Next.js App Router: Portal, /admin, /plataforma, /api/*
packages/domain  Entidades, casos de uso e contratos de repositório
packages/infra   Repositórios Firebase/Firestore e gateways
packages/shared  Tipos, schemas, enums, regras utilitárias
packages/ui      Componentes reutilizáveis e tokens visuais
packages/config  Presets TypeScript, ESLint, Tailwind
scripts/         Seeds, scripts operacionais e verificações
docs/            Arquitetura, procedimentos e políticas
```

Os registros principais seguem `tenantId` e controles de acesso. O conteúdo do Acervo usa `ArchiveItem`, `ArchiveMedia` e `MediaAsset`; o Portal mantém compatibilidade com módulos de Arquivos/Biblioteca/Galeria já existentes.

## Pré-requisitos e instalação

- Node.js >= 20.16; pnpm >= 9 (versão de referência `pnpm@9.15.0`);
- Firebase Auth e Firestore ou emuladores em ambiente de desenvolvimento;
- variáveis de ambiente conforme `apps/web/.env.example` e documentação de cada integração.

```bash
corepack enable
pnpm install
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @vl6/web dev
```

As configurações são divididas em:

1. **Client SDK**: `NEXT_PUBLIC_FIREBASE_*` (informações públicas de inicialização da aplicação).
2. **Firebase Admin**: `FIREBASE_PROJECT_ID` e credenciais de conta de serviço **somente em servidor** (`FIREBASE_CLIENT_EMAIL` com `FIREBASE_PRIVATE_KEY_BASE64` ou `FIREBASE_PRIVATE_KEY`); alternativamente, credenciais de aplicação padrão em ambiente autorizado. Nunca comitar JSON de conta de serviço.
3. **Vercel Blob**: `BLOB_READ_WRITE_TOKEN` para upload/armazenamento de mídias do portal.
4. **Integrações opcionais e crons**: parâmetros de Google Calendar, Wix (Cripta, conforme ambiente), `CRON_SECRET` e flags de capacidade sob documentação específica.

Exemplos e chaves não devem ser copiados para README, commits ou saídas de terminal compartilhadas. Não existe Firebase Cloud Functions neste monorepo; isso **não** estabelece o plano de cobrança do Firebase. A instância operacional `portalvl6` foi identificada no plano Blaze em 28/09/2026.

### Desenvolvimento com emuladores

```bash
firebase emulators:start
```

Para seeds em ambiente local, consulte `scripts/seed-tenant.ts` e as condições necessárias no cabeçalho do script. O acesso por subdomínio local deve observar a resolução de tenant descrita em [07-fluxo-autenticacao.md](./docs/architecture/07-fluxo-autenticacao.md). **Nunca** executar seed de tenant contra produção sem conferência do projeto, identidade e finalidade.

## Comandos

```bash
pnpm dev                 # Turbo: desenvolvimento
pnpm build               # Turbo: compilação
pnpm lint                # Turbo: lint
pnpm type-check          # Turbo: checagem de tipos
pnpm test                # Turbo: testes unitários
pnpm test:e2e            # Testes E2E com emuladores (ver scripts/run-e2e.sh)
pnpm format:check        # Verificação de formatação
pnpm --filter @vl6/web build
pnpm --filter @vl6/domain test
```

Há CI em `.github/workflows/validate-portal.yml`; a Vercel cuida de preview e produção de acordo com a branch/ambiente configurados. **Build aprovado, deploy READY e testes visuais autenticados são verificações distintas**.

## Manutenção de dados: exemplo de migração segura

O script `scripts/normalize-temple-location.ts` altera exclusivamente valores antigos do campo `local` dos eventos da Loja para `Templo da Verdadeira Luz - Ivan Damasceno`. Ele exige um `TENANT_ID` explícito, autenticação Firebase Admin e roda em **simulação por padrão**.

```bash
# Após configurar o TENANT_ID e credenciais administrativas seguras:
pnpm --filter @vl6/scripts exec tsx normalize-temple-location.ts
# Conferir scanned/candidates; aplicar só com autorização:
pnpm --filter @vl6/scripts exec tsx normalize-temple-location.ts --apply
# Verificar candidatos remanescentes:
pnpm --filter @vl6/scripts exec tsx normalize-temple-location.ts
```

**Histórico de 28/09/2026:** 81 documentos examinados, 61 atualizados e, em nova simulação, nenhum candidato restante. Trata-se de um registro de execução, não de um job recorrente. A chave temporária usada na operação foi posteriormente revogada pelo administrador; não deve permanecer no repositório nem ser reutilizada.

## Publicação e segurança operacional

- `apps/web/vercel.json` define os crons de aniversários, backup, limpeza do piloto da Cripta, publicações agendadas e tarefas de notificações/comunicação.
- `firebase.json` e `firestore.rules` tratam dos emuladores e das regras/índices do Firestore. Binários comuns ficam no Vercel Blob, não no Firebase Storage.
- Alterações em RBAC, regras Firestore, importações, migrações e chaves exigem revisão específica e testes, além do build.
- O desenho/limitações da **Cripta** estão registrados em `docs/architecture/cripta-*.md`. Não habilitar custódia real com base apenas em um deployment bem-sucedido.
- Termos e LGPD: `docs/legal/`. Verificar versões publicadas e aceite quando houver mudanças relevantes no tratamento de dados.

## Documentação

Comece pelo [índice arquitetural](./docs/architecture/00-README.md). A [visão geral](./docs/architecture/01-visao-geral.md) explica as decisões de fundação; [modelo de dados](./docs/architecture/03-modelo-dados.md), [RBAC](./docs/architecture/08-permissoes-rbac.md), [Acervo](./docs/architecture/11-acervo-vl6.md), [biblioteca](./docs/architecture/12-biblioteca-e-circulacao.md), [comunidade paramaçônica](./docs/architecture/12-comunidade-paramaconica.md), [Cripta](./docs/architecture/cripta-operacao-real.md) e [estado atual](./docs/architecture/13-estado-atual-e-operacao.md) complementam a referência.

### Cripta — preparação para cartas reais

Veja a [revisão de liberação de 29/09/2026](docs/architecture/cripta-revisao-liberacao-2026-09-29.md), com correções, evidências e pendências. O recebimento institucional ainda não está liberado; o acesso continua restrito ao piloto.

### Conhecimento VL6

Formação continuada aditiva, com instruções por grau, aulas, atividades, avaliações e progresso privado. Vincula leituras ao catálogo existente sem modificar Acervo ou Biblioteca. Arquitetura, Firestore, protocolos de publicação e roteiro de implantação: [Conhecimento VL6](docs/architecture/14-conhecimento-vl6.md).

### Central de Administração VL6

A entrada administrativa é `/admin`, com Publicações e Agenda, Pessoas e Loja,
Acervo e Biblioteca, Conhecimento, Cripta e Configurações e Auditoria.
Consulte [arquitetura e compatibilidade](docs/architecture/15-central-administracao-vl6.md).

### Dashboard integrado e relatórios

A visão geral administrativa reúne panorama institucional, módulos, cobertura de acesso, pendências, agenda e auditoria por período em uma única página. Relatórios CSV/PDF preservam filtros, autorização e indicação de cobertura. Consulte [fontes, fórmulas e limites](docs/architecture/16-dashboard-visao-geral-vl6.md).
