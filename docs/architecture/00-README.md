# Arquitetura — Portal do Irmão VL6

Este diretório contém a arquitetura completa do **Portal do Irmão VL6**, plataforma oficial
da Loja Maçônica Verdadeira Luz nº 06, projetada desde o início para operar em modelo
**multi-tenant** e ser futuramente comercializada para outras Lojas sem alteração de código.

> Nenhum código de implementação foi gerado ainda. Este é o material de planejamento
> previsto nas etapas 1–10 do processo solicitado. A implementação só começa após
> aprovação explícita deste material.

## Índice

| # | Documento | Conteúdo |
|---|-----------|----------|
| 1 | [01-visao-geral.md](./01-visao-geral.md) | Objetivo, princípios arquiteturais, stack, decisões de alto nível |
| 2 | [02-estrutura-diretorios.md](./02-estrutura-diretorios.md) | Árvore completa de diretórios (monorepo) |
| 3 | [03-modelo-dados.md](./03-modelo-dados.md) | Modelo de dados Firestore — coleções, campos, índices, regras de segurança |
| 4 | [04-tipos-typescript.md](./04-tipos-typescript.md) | Contratos TypeScript de domínio (entidades, DTOs, enums) |
| 5 | [05-componentes.md](./05-componentes.md) | Catálogo de componentes reutilizáveis e design system técnico |
| 6 | [06-regras-negocio.md](./06-regras-negocio.md) | Regras de negócio por módulo |
| 7 | [07-fluxo-autenticacao.md](./07-fluxo-autenticacao.md) | Autenticação, sessão, multi-tenant resolution, API/JWT |
| 8 | [08-permissoes-rbac.md](./08-permissoes-rbac.md) | Papéis, permissões, matriz RBAC |
| 9 | [09-design-system.md](./09-design-system.md) | Identidade visual, tokens, temas claro/escuro |
| 10 | [10-roadmap.md](./10-roadmap.md) | Roadmap de versões v1.0 → v2.x |

## Como revisar

Cada documento é independente e pode ser aprovado separadamente, mas recomenda-se
revisar na ordem acima, pois cada um depende de decisões tomadas no anterior
(ex.: o modelo de dados depende dos princípios definidos na visão geral).

Ao final, será necessário validar principalmente:

1. **Modelo de dados** (03) — difícil de alterar depois de haver dados em produção.
2. **RBAC** (08) — impacta segurança de todo o sistema.
3. **Roadmap** (10) — define o que entra no MVP (v1.0) vs. versões futuras.
