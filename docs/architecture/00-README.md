# Arquitetura — Portal do Irmão VL6

Este diretório documenta a arquitetura e a evolução do **Portal do Irmão VL6**, plataforma
oficial da Loja Maçônica Verdadeira Luz nº 06, preparada para operar em modelo
**multi-tenant** e ser futuramente disponibilizada a outras Lojas sem alteração de código.

Os documentos 1–10 registram as decisões de fundação do sistema. O documento 11 inicia a
evolução incremental do Acervo VL6 sobre a implementação que já existe no repositório.

## Índice

| #   | Documento                                                  | Conteúdo                                                                   |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1   | [01-visao-geral.md](./01-visao-geral.md)                   | Objetivo, princípios arquiteturais, stack, decisões de alto nível          |
| 2   | [02-estrutura-diretorios.md](./02-estrutura-diretorios.md) | Árvore completa de diretórios (monorepo)                                   |
| 3   | [03-modelo-dados.md](./03-modelo-dados.md)                 | Modelo de dados Firestore — coleções, campos, índices, regras de segurança |
| 4   | [04-tipos-typescript.md](./04-tipos-typescript.md)         | Contratos TypeScript de domínio (entidades, DTOs, enums)                   |
| 5   | [05-componentes.md](./05-componentes.md)                   | Catálogo de componentes reutilizáveis e design system técnico              |
| 6   | [06-regras-negocio.md](./06-regras-negocio.md)             | Regras de negócio por módulo                                               |
| 7   | [07-fluxo-autenticacao.md](./07-fluxo-autenticacao.md)     | Autenticação, sessão, multi-tenant resolution, API/JWT                     |
| 8   | [08-permissoes-rbac.md](./08-permissoes-rbac.md)           | Papéis, permissões, matriz RBAC                                            |
| 9   | [09-design-system.md](./09-design-system.md)               | Identidade visual, tokens, temas claro/escuro                              |
| 10  | [10-roadmap.md](./10-roadmap.md)                           | Roadmap de versões v1.0 → v2.x                                             |
| 11  | [11-acervo-vl6.md](./11-acervo-vl6.md)                     | Integração, experiência e evolução do Acervo VL6                           |

## Como revisar

Os documentos de fundação devem ser revisados na ordem em que aparecem. Evoluções
posteriores precisam declarar expressamente quais decisões anteriores preservam, substituem
ou ampliam.

As áreas mais sensíveis continuam sendo:

1. **Modelo de dados** — alterações exigem migração e compatibilidade.
2. **RBAC** — impacta a segurança de todo o sistema.
3. **Roadmap** — separa entregas funcionais de capacidades futuras.
4. **Acervo VL6** — deve evoluir de forma integrada, sem duplicar entidades existentes.
