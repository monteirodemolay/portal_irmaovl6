# 10. Roadmap por Versões

Critério de corte de cada versão: entregar um conjunto **coeso e usável**
de módulos, sem deixar nenhum módulo "pela metade" — alinhado ao requisito
de nunca gerar código incompleto.

## v0.1 — Fundação (infraestrutura, sem telas de negócio ainda)

- Monorepo (pnpm + Turborepo), lint/format/husky, presets de config.
- `packages/domain` com `BaseEntity`, `Result`, módulo **Tenancy** e
  **IdentityAccess** completos (entidades + casos de uso + testes).
- `packages/infra` com repositórios Firestore desses dois módulos.
- Firebase project setup (Auth, Firestore, Storage), `firestore.rules` base,
  seed do tenant Verdadeira Luz nº 06.
- Design system inicial (`packages/ui`): tokens + primitivos Shadcn.
- Autenticação completa (login, sessão, Custom Claims, RBAC básico — doc 07/08).
- Layout raiz com `TenantBranding` dinâmico + dark mode.

## v1.0 — MVP administrativo e institucional

Objetivo: a Loja consegue operar o essencial no dia a dia.

- **Site público**: Home, Nossa Loja, Diretoria (pública), Contato, Notícias
  públicas.
- **Área do Irmão**: Dashboard, Meu Perfil, Diretoria, Avisos, Notícias.
- **Painel Administrativo**: Gestão da Loja (branding/config), Cadastro de
  Irmãos completo — incluindo importação em massa (planilha .xlsx ou
  relatório .pdf de outro sistema, com wizard de revisão/seleção antes de
  gravar) e autoatendimento de acesso (`/reivindicar`: o próprio Irmão
  cria e-mail/senha por Nome + CIM, sem depender do Administrador) —,
  Gestões/Diretoria, Usuários, Permissões (RBAC visual), Avisos, Notícias.
- **Auditoria** (registro automático via Cloud Function) e **Soft Delete**
  em todas as entidades.
- Exportação básica (CSV/JSON) de listagens administrativas.

## v1.1 — Conteúdo e organização documental

- **Arquivos** (upload, categorias, versionamento, contadores).
- **Biblioteca** (categorias/subcategorias, favoritos, leitura online).
- **Agenda/Eventos** completos (sessões, cursos, palestras, confraternizações,
  confirmação de presença) + aniversários automáticos.
- **Downloads** e **Links Úteis** na Área do Irmão.
- Notificações internas (sino + central de notificações) ligadas a
  Avisos/Eventos.

## v1.2 — Comunidade e engajamento

- **Comissões** completas (vínculo com gestão + permissões de escopo).
- **Galeria** (álbuns, fotos, vídeos, categorias, busca).
- **Pesquisa de Irmãos** avançada (filtros por grau, cargo, cidade, CIM,
  situação).
- Comentários moderados em Notícias.
- MFA opcional (TOTP) para contas administrativas.
- Backup automático diário + exportação Excel/PDF.

## v1.3 — Qualidade e robustez

- Cobertura de testes: unitários (domínio/aplicação), componentes, E2E dos
  fluxos críticos (login, cadastro de Irmão, publicação de conteúdo).
- PWA completo (instalável, funcionamento offline básico de leitura).
- Observabilidade: logging estruturado, métricas de performance (Web
  Vitals), alertas de erro (Sentry ou equivalente).
- Rate limiting e hardening da API REST + publicação do OpenAPI.

## v2.0 — Multi-tenant comercial

Objetivo: o produto pode ser vendido/instalado para **outra Loja** sem
nenhuma alteração de código — apenas cadastro de um novo tenant.

- Onboarding self-service de novo tenant (wizard: dados da Loja, branding,
  módulos habilitados, primeiro Administrador).
- Domínio customizado por tenant (verificação de DNS).
- Painel do Administrador Geral (cross-tenant): billing/plano,
  monitoramento de uso, suporte.
- Internacionalização real (idioma configurável por tenant, não só textos
  institucionais).
- API pública documentada para integrações de terceiros.

## v2.1+ — Integrações e IA

Módulos preparados desde o início (contratos de domínio já existentes:
`INotificationGateway`, `IIdentityFederationGateway` etc.), implementados
nesta fase conforme demanda real:

- WhatsApp Business API (notificações e, futuramente, atendimento).
- Microsoft 365 / Google Workspace (SSO federado, calendário, e-mail).
- PIX (cobrança de mensalidades/contribuições — exige módulo financeiro novo,
  fora do escopo atual, a ser modelado quando priorizado).
- OCR (digitalização de atas e documentos históricos).
- IA: pesquisa semântica sobre Biblioteca/Arquivos, resumo automático de
  atas, assistente administrativo para o Secretário.
- Integrações GLEG / CMSB conforme APIs/formatos disponibilizados por essas
  entidades (dependência externa, não controlada pelo roadmap interno).

## Fora de escopo até indicação contrária

Módulo financeiro/contábil completo (mensalidades, boletos, fluxo de caixa)
não está em nenhum dos itens funcionais originais — citado apenas como
integração futura (PIX). Se for prioridade, precisa de uma rodada de
modelagem própria (DDD de um novo bounded context `Finance`) antes de entrar
no roadmap.
