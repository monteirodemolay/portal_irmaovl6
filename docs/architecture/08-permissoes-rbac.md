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

`✔` = todas as ações (`manage`) · `R` = somente leitura · `RW` = ler/criar/editar
(sem excluir/publicar) · `–` = sem acesso

| Recurso | Admin Geral | Administrador | Venerável Mestre | Secretário | Tesoureiro | Diretoria | Comissão | Irmão | Visitante |
|---|---|---|---|---|---|---|---|---|---|
| tenant (config da Loja) | ✔ (todas) | ✔ (própria) | R | R | R | R | – | – | – |
| branding | ✔ | ✔ | R | – | – | – | – | – | – |
| member | ✔ | ✔ | RW | RW | R | R | – | R (próprio: RW) | – |
| boardTerm / committee | ✔ | ✔ | ✔ | RW | R | R | R (própria) | R | – |
| file | ✔ | ✔ | RW | RW | R | RW | RW (própria) | R | – |
| libraryItem | ✔ | ✔ | RW | RW | R | R | R | R | – |
| event | ✔ | ✔ | RW | RW | R | RW | RW | R + confirmar presença | R (públicos) |
| news | ✔ | ✔ | RW | RW | – | R | – | R | R (públicas) |
| announcement | ✔ | ✔ | RW | RW | – | R | – | R | – |
| gallery | ✔ | ✔ | RW | RW | – | RW | – | R | R (públicas) |
| user | ✔ | ✔ (do tenant) | – | – | – | – | – | – | – |
| role | ✔ | ✔ (do tenant) | – | – | – | – | – | – | – |
| auditLog | ✔ | R (do tenant) | – | – | – | – | – | – | – |

> A matriz acima é a configuração **padrão de fábrica** de cada novo tenant
> (seed inicial). O Administrador do tenant pode, a partir do Painel de
> Permissões, criar variações — a matriz não é hardcoded no código, é dado
> em `roles.permissoes`.

## 8.3 Regras específicas

- **Administrador Geral** (`super_admin`) é papel de operação da plataforma
  (não pertence a um tenant específico) — usado para suporte/onboarding de
  novas Lojas, nunca atribuído a Irmãos comuns.
- **Irmão** tem RW sobre seu **próprio** registro `member` (perfil), mas
  apenas leitura sobre os demais — regra avaliada por caso de uso
  (`isOwnRecord`), não apenas pela permissão genérica.
- **Visitante** é o único papel com acesso ao **site público** sem sessão
  autenticada — tecnicamente nem precisa de `User`; é o "papel" implícito de
  quem não está logado, usado para decidir o que é servido nas rotas
  `(public)`.
- **Comissão** só enxerga/edita os recursos vinculados à(s) comissão(ões) às
  quais o Irmão pertence (`committee.membrosIds` contém o `memberId` do
  usuário) — permissão de escopo, não apenas de recurso.

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
