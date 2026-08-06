# 7. Fluxo de Autenticação e API

## 7.1 Resolução de Tenant (antes até de autenticar)

```
Requisição → Next.js Middleware
   1. Lê host (domínio/subdomínio)
   2. Resolve Tenant via cache (TanStack Query no server / KV) → fallback Firestore
   3. Injeta tenantId resolvido em headers internos (x-tenant-id) para toda a árvore de rota
   4. Se domínio não corresponder a nenhum tenant ativo → 404 institucional
```

## 7.2 Login (Web)

```
1. Usuário informa e-mail/senha (ou Google) na tela (auth)/login
2. Firebase Authentication client SDK autentica → recebe ID Token (JWT, curta duração ~1h)
3. ID Token é trocado por um cookie de sessão HttpOnly/Secure via Route Handler
   (/api/v1/auth/login) usando Firebase Admin SDK (createSessionCookie)
4. Cookie de sessão carrega Custom Claims: { tenantId, roleId, permissions[] }
5. Middleware de rotas (member)/(admin) valida o cookie a cada navegação (verifySessionCookie)
6. Usuário sem User.statusConta == 'active' é bloqueado com mensagem apropriada
```

Cookie de sessão (não o ID Token cru) é escolhido para as rotas de página
porque permite validação em Server Components/Middleware sem round-trip ao
client, e porque tem duração configurável mais longa (até 14 dias) com
renovação silenciosa.

## 7.3 Custom Claims — como e quando são atualizados

Custom Claims (`tenantId`, `roleId`, `permissions`) são a fonte de verdade
usada pelas Firestore Security Rules e pelo middleware. Eles **não** são
atualizados a cada request — apenas quando:

- Um usuário é criado (`syncUserClaims`, chamado explicitamente por toda
  Server Action que cria conta — `inviteUserAction`, `bootstrapTenantAdmin`,
  `bootstrapPlatformAdmin`, o onboarding de nova Loja)
- O papel (`roleId`) de um usuário muda (`syncUserClaims` em
  `assignRoleAction`)
- As permissões de um `Role` mudam (ainda não implementado — não há UI de
  edição de papel `sistemico` hoje; quando existir, precisa recalcular
  claims de todos os usuários daquele papel em lote)

Sem plano Blaze, não há Cloud Functions implantadas — os dois primeiros
casos eram originalmente um trigger `onUserWritten`, substituído por
chamada explícita de `syncUserClaims` (`packages/infra`) em cada caminho de
escrita, já que toda escrita em `users` passa por Server Actions/scripts
sob nosso controle (nunca client direto).

Após atualização de claims, o client é forçado a renovar o token
(`getIdToken(true)`) na próxima ação sensível, ou na próxima renovação
natural do cookie de sessão.

## 7.4 Autorização em cada camada (defesa em profundidade)

```
1. UI          — esconde ações que o usuário não pode executar (UX, não segurança)
2. Server Action / Route Handler — valida permissão via caso de uso
   (`RequirePermission(permissions, 'member:update')`) antes de chamar o repositório
3. Firestore Security Rules — última linha de defesa, valida tenantId + permission claim
```

Nenhuma camada confia exclusivamente na anterior — a regra de segurança do
Firestore é escrita como se a camada de aplicação não existisse.

## 7.5 API REST pública (`/api/v1/*`)

- Autenticação via **JWT Bearer** (não o cookie de sessão — a API é para
  integrações externas/futuro app mobile).
- Fluxo: `POST /api/v1/auth/login` (credenciais) → `{ accessToken (15min),
refreshToken (30 dias, armazenado hash no Firestore) }`.
- `POST /api/v1/auth/refresh` troca um refresh token válido (e ainda não
  revogado) por um novo par de tokens (rotação de refresh token — previne
  replay).
- `POST /api/v1/auth/logout` revoga o refresh token corrente.
- **Rate limiting**: por IP + por `tenantId`, implementado com contador em
  memória compartilhada (ex.: Upstash Redis) — 100 req/min de leitura, 20
  req/min de escrita por padrão, configurável por rota.
- Documentação **OpenAPI 3.1** gerada a partir dos schemas Zod
  (`zod-to-openapi`), servida em `/api/v1/openapi.json` e visualizável via
  Swagger UI em ambiente de desenvolvimento.

> Nota de implementação: o design acima (par access/refresh JWT) é o
> desenho original da API. O que existe hoje para rotas consumidas pelo
> próprio app é sessão via cookie HttpOnly (`POST /api/v1/auth/login` troca
> um ID Token do Firebase por esse cookie — ver §7.2). Rotas pensadas para
> **integrações de terceiros** (nunca um usuário humano), como `GET
/api/v1/members`, usam em vez disso uma **API Key** (§7.9).

## 7.6 MFA (preparado)

`User.mfaHabilitado` e o suporte nativo do Firebase Auth a segundo fator
(TOTP/SMS) ficam previstos no modelo desde o v1.0, com ativação de fato
planejada para v1.2 (ver roadmap) — evita retrabalho de schema depois.

## 7.7 Recuperação de senha

Fluxo padrão do Firebase Auth (`sendPasswordResetEmail`), com template de
e-mail customizado por tenant (usa `TenantBranding` para logotipo/cores no
e-mail, renderizado via Cloud Function + serviço de e-mail transacional).

## 7.8 Sessão — expiração e renovação

- Cookie de sessão: 5 dias, renovado silenciosamente se o usuário estiver
  ativo (rota intermediária `/api/v1/auth/refresh-session`).
- Logout explícito revoga o cookie no Admin SDK (`revokeRefreshTokens`),
  invalidando também qualquer sessão antiga do mesmo usuário — importante
  para o caso "esqueci de sair no computador da Loja".

## 7.9 API Keys para integrações de terceiros (v2.0)

- Emitidas em `/admin/integracoes` (permissão `tenant:manage`) — o
  Administrador da Loja escolhe um nome e um subconjunto das suas próprias
  permissões (`ApiKey.permissoes`); nunca pode exceder o que o próprio
  emissor tem (`CreateApiKeyUseCase`).
- O valor em texto puro (`vl6_live_<...>`) só é mostrado uma vez, na
  criação — persiste-se apenas `keyHash` (SHA-256) e um `keyPrefix` (para
  exibição na listagem).
- Autenticação: header `Authorization: Bearer <chave>`. O handler resolve
  um `AuthContext` sintético via `AuthenticateApiKeyUseCase` — `roleId:
'api-key'`, `permissions` fixadas na emissão — sem sessão de usuário
  envolvida (`resolveApiKeyContext`, `apps/web/src/lib/api/`).
- Revogação é soft-delete (`ApiKeyRepository.update` com `deletedAt`
  setado) — chamadas subsequentes com a chave revogada recebem 401.
- Rate limit por `apiKey.id` (não por IP): cada integração tem sua própria
  cota, independente de outras rodando atrás do mesmo IP/CDN.
- `GET /api/v1/members` é a primeira rota deste tipo — autenticada só por
  API Key, sem fallback de cookie de sessão (deliberado: nunca um humano
  logado deveria bater nela).
