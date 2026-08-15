# 8. Permissões (RBAC)

## 8.1 Modelo

`Permission = "<recurso>:<ação>"`. Um `Role` é um conjunto de `Permission`.
Um `User` tem exatamente um `Role`. Papéis padrão (`sistemico = true`) vêm
pré-configurados por tenant na criação da Loja; **cada tenant pode criar
papéis customizados** com qualquer combinação de permissões (atende ao
requisito "cada função deverá possuir permissões independentes").

Recursos (`ResourceKey`): `tenant`, `branding`, `member`, `boardTerm`,
`committee`, `file`, `libraryItem`, `event`, `news`, `announcement`,
`gallery`, `user`, `role`, `auditLog`.

Ações (`ActionKey`): `create`, `read`, `update`, `delete`, `publish`,
`export`, `manage` (equivale a todas as ações anteriores sobre o recurso).

## 8.2 Matriz de papéis padrão × permissões

Só 3 níveis de fábrica — `admin`/`membro` são o seed de toda Loja nova,
`super_admin` é cross-tenant e nunca pertence a uma Loja específica (§8.3).
`✔` = todas as ações (`manage`) · `R` = somente leitura · `–` = sem acesso.

| Recurso                 | Admin Geral (`super_admin`) | Administrador da Loja (`admin`) | Membro (`membro`) |
| ----------------------- | --------------------------- | ------------------------------- | ----------------- |
| tenant (config da Loja) | ✔ (todas)                   | ✔ (própria)                     | R                 |
| branding                | ✔                           | ✔                               | –                 |
| member                  | ✔                           | ✔                               | R                 |
| boardTerm / committee   | ✔                           | ✔                               | R                 |
| file                    | ✔                           | ✔                               | R                 |
| libraryItem             | ✔                           | ✔                               | R                 |
| event                   | ✔                           | ✔                               | R                 |
| news                    | ✔                           | ✔                               | R                 |
| announcement            | ✔                           | ✔                               | R                 |
| gallery                 | ✔                           | ✔                               | R                 |
| link                    | ✔                           | ✔                               | R                 |
| user                    | ✔                           | ✔ (do tenant)                   | –                 |
| role                    | ✔                           | ✔ (do tenant)                   | –                 |
| auditLog                | ✔                           | R (do tenant)                   | –                 |

> A matriz acima é a configuração **padrão de fábrica** de cada novo tenant
> (seed inicial). O Administrador do tenant pode, a partir do Painel de
> Permissões, criar variações — a matriz não é hardcoded no código, é dado
> em `roles.permissoes`. Uma Loja que precise de um nível intermediário
> (ex.: alguém que só publica Notícias, sem gerenciar Usuários) cria um
> papel customizado (`sistemico = false`) com o subconjunto de permissões
> que fizer sentido — não é um papel de fábrica.

## 8.3 Regras específicas

- **Administrador Geral** (`super_admin`) é papel de operação da plataforma
  (não pertence a um tenant específico) — usado para suporte/onboarding de
  novas Lojas, nunca atribuído a Irmãos comuns.
- **Cargo institucional ≠ papel de acesso.** Venerável Mestre, Secretário,
  Tesoureiro etc. são `BoardPositionKey` (packages/shared/src/enums/
  governance.ts) — atributo de uma gestão (`BoardTerm`/
  `BoardPositionAssignment`), sem relação nenhuma com o `RoleKey` do login.
  Um Secretário em exercício pode ser só `membro` no sistema, ou receber
  `admin` se quem administra a Loja decidir dar acesso administrativo — a
  ocupação do cargo não muda automaticamente o papel de acesso.
- **Membro** tem só leitura em todo recurso; não há RW nem sobre o próprio
  registro `member` nesta fase (perfil é editado por quem tem `admin`).
- Não existe papel implícito para visitante anônimo: quase toda a
  plataforma exige sessão autenticada (docs/architecture/07 §7.0/§7.1) —
  as únicas rotas funcionais sem login são `/login`, a recuperação de
  senha, `/reivindicar` (autoatendimento de criação de acesso, §7.2b — só
  expõe nomes, nunca dados sensíveis) e `/offline`.

## 8.4 Onde a permissão é verificada (recap da doc 07 §7.4)

1. UI: hook `usePermissions()` esconde/mostra ações.
2. Aplicação: decorator/guard `requirePermission('member:update')` em todo
   caso de uso que faz escrita.
3. Firestore Rules: `hasPermission('member:update')` lendo do Custom Claim.

## 8.5 Evoluções previstas (fora do escopo do v1.0 — ver roadmap)

- Permissões com escopo temporal (ex.: acesso de Diretoria expira ao fim da
  gestão automaticamente).
- Delegação temporária de permissão (ex.: Secretário em licença delega a um
  substituto por período determinado).
