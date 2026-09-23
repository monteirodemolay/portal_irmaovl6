# Inventário de Dados Pessoais e Auditoria LGPD — Portal do Irmão VL6

> **Status:** rascunho técnico, gerado por auditoria direta do código-fonte (não é peça jurídica).
> **Versão:** 1.0.0 · **Data:** 22/09/2026 · **Autor:** Auditoria automatizada (5 varreduras paralelas do repositório) + consolidação.
> **Objetivo:** servir de base factual para a Política de Privacidade, os Termos de Uso e o sistema de versionamento vivo descritos em `docs/legal/` (a construir). Nada aqui deve ser copiado para uma peça jurídica sem revisão de um advogado especialista em Direito Digital/LGPD — este documento aponta *o que o sistema faz*, não *o que ele deveria dizer juridicamente*.
>
> Este inventário **não substitui revisão jurídica**. Vários pontos abaixo (bases legais, prazos de retenção, tratamento de dados de menores e de terceiros) exigem validação formal antes de virarem texto contratual.

---

## 1. Sumário executivo

O Portal do Irmão VL6 é uma aplicação Next.js (monorepo `apps/web` + `packages/domain,infra,shared,ui`), multi-tenant (cada Loja é um `tenantId`), com:

- **Autenticação:** Firebase Authentication (e-mail/senha + MFA TOTP opcional), sessão via cookie `HttpOnly` de 5 dias.
- **Persistência:** Firestore (multi-tenant, ~40 coleções mapeadas), sem Cloud Functions reais (plano Firebase Spark) — toda automação roda em rotas de cron do Next.js (Vercel Cron) e Server Actions com Admin SDK.
- **Armazenamento de arquivos:** Vercel Blob (não há mais Firebase Storage) — todo blob é `access: public`; o controle de acesso é feito por rotas proxy autenticadas no Next.js, não por regra declarativa.
- **RBAC:** permissões `recurso:ação` centralizadas, checadas em 3 camadas (UI, Server Action/caso de uso, Firestore Rules).
- **Auditoria:** log append-only (`auditLogs`) cobrindo ~25+ coleções, mais um log específico de consentimento de publicação (`publicationConsents`).

Achados que mais importam para a Política de Privacidade e os Termos de Uso:

1. O Portal trata **dado potencialmente sensível por afiliação/convicção filosófica** (grau maçônico, trajetória, Grau Filosófico) — já reconhecido como sensível no próprio desenho do código em um módulo (`philosophicalJourney.visivel`, opt-in), mas não de forma consistente em outros (dados maçônicos gerais em `Member`).
2. O Portal trata **dados de terceiros não-usuários** (cônjuge, filhos, familiares no módulo Família e Legado) e **dados de menores de idade** (filhos do Irmão, integrantes de entidades paramaçônicas como DeMolay/Abelhinhas, `FamilyPerson.menorDeIdade`) — com proteção desigual: um módulo já bloqueia publicação de menores por regra, outros não têm o mesmo controle.
3. **Nome e aniversário de cônjuge/filhos aparecem para todo Irmão autenticado no Diretório**, independentemente das preferências de publicação do titular — decisão de produto explícita no código, mas ponto de atenção jurídica (terceiros sem mecanismo de consentimento próprio).
4. **Auditoria e backups retêm dados pessoais indefinidamente**, inclusive após exclusão lógica do dado original — não há expurgo automático de `auditLogs` nem do backup diário completo (Vercel Blob).
5. **Arquivos armazenados no Vercel Blob são publicamente acessíveis por URL** (proteção apenas por não-adivinhação); documentos sensíveis passam por proxy autenticado, mas fotos de perfil/capas usam URL direta.
6. Existe uma **API pública `/api/v1/members`** autenticada por API Key que expõe nome, e-mail, cidade e dados maçônicos de Irmãos a sistemas externos — é um canal de compartilhamento com terceiros a mapear formalmente.
7. **Exclusão de conta não apaga o cadastro institucional (`Member`)** — o titular pode apagar sua conta de acesso, mas o registro maçônico permanece (decisão de produto documentada no próprio código como pendente de validação jurídica).
8. Não foi encontrada nenhuma rotina de atendimento a direitos do titular (exportação/eliminação completa mediante solicitação) além da autoexclusão de conta — a Central de Solicitações prevista na área "Termos e Privacidade" precisará ser majoritariamente **operacional/manual** hoje, não automatizada.

---

## 2. Arquitetura de dados (visão geral)

| Camada | Tecnologia | Observação |
|---|---|---|
| Autenticação | Firebase Authentication | E-mail/senha + MFA TOTP opcional (self-service); sem OAuth social |
| Sessão | Cookie `__vl6_session` (HttpOnly, Secure em prod, SameSite=Lax, 5 dias) | Gerado a partir do ID Token via `createSessionCookie` (Admin SDK) |
| Banco de dados | Firestore (multi-tenant, coleções flat filtradas por `tenantId`) | ~40 coleções: identidade, cadastro, governança, biblioteca, agenda, conteúdo, galeria, acervo, auditoria, notificação, integrações, CMS público, Central VL6, Família e Legado |
| Automação/agendamento | Rotas `apps/web/src/app/api/cron/*` (Vercel Cron) | **Não há Cloud Functions em produção** (plano Firebase Spark); substituem triggers |
| Arquivos/mídia | Vercel Blob (`access: public`) | Sem `storage.rules`; controle de acesso via proxy autenticado no Next.js |
| RBAC | `packages/shared/src/enums/rbac.ts` | Permissões `recurso:ação`; Custom Claims no Firebase Auth (`tenantId`,`roleId`,`permissions`) |
| Auditoria | Coleção `auditLogs` (append-only) | Snapshot completo antes/depois em ~25 coleções via `withAudit` (Proxy) |
| Consentimento | Coleção `publicationConsents` (append-only) | Registro formal de aceite/revogação de publicação no Diretório/Central |
| Backup | `apps/web/src/app/api/cron/daily-backup/route.ts` | Dump diário de ~27 coleções para Vercel Blob, sem expurgo |
| Observabilidade | Logger estruturado interno + Sentry (condicional a DSN) | Sem analytics/telemetria de produto (nenhum GA/Firebase Analytics/PostHog) |

---

## 3. Inventário de dados pessoais por módulo

### 3.1 Identidade e acesso (`users`, Firebase Auth)

| Dado | Origem/coleta | Armazenamento | Quem vê / edita / exclui | Retenção | Finalidade |
|---|---|---|---|---|---|
| E-mail | Login, convite, autorreivindicação | Firebase Auth + `users.email` | Próprio usuário (leitura); Admin (`user:manage`) edita/reseta; exclusão só via "excluir minha conta" | Indefinida (soft delete) | Identificação/login |
| Senha | Login, cadastro, troca | Só Firebase Auth (nunca no Firestore/logs) | Ninguém no backend da aplicação | Até troca/exclusão | Autenticação |
| Cookie/token de sessão | Login | Cookie `HttpOnly` no navegador + claims no Firebase Auth | Só o navegador do usuário; Admin SDK pode revogar | 5 dias / até logout | Sessão autenticada |
| `ultimoLogin` | A cada login | `users.ultimoLogin` (Firestore) | Próprio usuário + quem tem `user:read` | Indefinida | Auditoria de atividade/segurança |
| Custom Claims (`tenantId`,`roleId`,`permissions`) | Criação/alteração de conta | Firebase Auth | Sistema (Rules, middleware) | Enquanto a conta existir | Autorização (RBAC) |
| Senha temporária (convite/reset admin) | Ação do Admin | Exibida uma única vez em tela; não persistida | O Admin, na hora; repasse manual fora do sistema (risco de processo) | Não retida | Onboarding/reset |
| MFA (TOTP) | Autoatendimento do Irmão | Firebase Auth | Só o próprio usuário gerencia | Enquanto ativo | Segurança adicional (opcional) |
| Chaves de API (`apiKeys`) | Admin, painel de integrações | Só `keyHash` (SHA-256) + `keyPrefix`, nunca a chave em texto puro | `tenant:manage` | Até revogação (soft delete) | Integrações externas autenticadas |

### 3.2 Diretório dos Irmãos / Perfil (`members`)

Entidade central do sistema. Campos:

- **Identificação:** nome completo, foto, e-mail (opcional), telefone/WhatsApp, endereço completo, data de nascimento.
- **Trajetória maçônica:** datas de iniciação/elevação/exaltação, CIM, grau, cargo atual, situação (ativo/licenciado/desligado/falecido), data de falecimento, mensagem de homenagem (In Memoriam), Loja, potência.
- **Profissional:** profissão, empresa.
- **Estado civil e cônjuge:** estado civil, nome do cônjuge, data de nascimento/casamento do cônjuge — **dado de terceiro sem conta no Portal**.
- **Filhos:** nome + dia/mês de nascimento (sem ano), só para lembrete — **dado de menor de idade**.
- Biografia, redes sociais, observações internas da Secretaria, `autorizaDivulgacaoExterna` (opt-in para divulgação externa).
- **CPF/RG não foram localizados como campo estruturado** — confirmar com a equipe se são coletados fora do modelo de domínio (ex.: anexos avulsos).

Histórico complementar, sempre imutável/append-only: `MemberSituationRecord` (linha do tempo de situação cadastral, com anexos de documentos) e `MemberPositionHistory` (cargos ocupados).

**Quem vê o quê:** qualquer usuário com papel `membro` tem `member:read` e enxerga o cadastro **completo** de todos os demais Irmãos (endereço, telefone, nascimento, estado civil, dados do cônjuge, biografia, observações) — é o desenho intencional de "diretório interno", mas representa alta exposição interna de dado sensível e deve ser tratado como tal na política. O **perfil público filtrado** (`PublicMemberProfileDTO`) só mostra contato/endereço/bloco profissional se o próprio Irmão ativar o bloco correspondente (opt-in) — **exceto** nome e aniversário de cônjuge/filhos, que aparecem sempre, sem gate de opt-in.

Edição: Admin (`member:update`) ou o próprio Irmão via autoatendimento (Central VL6, campos limitados por schema próprio). Exclusão: nunca — não há hard delete de `members`.

### 3.3 Central VL6 (perfil voluntário) e Negócios (`memberCentralProfiles`)

Complemento **100% opcional e opt-in por design** ("nasce vazio", "cadastrar nunca implica publicar"): apresentação, interesses, área de atuação, formação, negócios (nome da empresa, segmento, **CNPJ**, contatos comerciais, logo), afiliações, lojas visitadas.

- Moderação: negócios passam por fluxo `draft → pending_review → published/suspended`, só o Admin publica/suspende.
- **Achado de atenção:** o CNPJ informado é usado para cruzar e revelar colegas de empresa entre Irmãos (`FindColleaguesByCnpjUseCase`) **mesmo que o negócio não esteja `divulgar`/`published`** — um dado que o Irmão não pretendia tornar público é usado para inferir e expor vínculo profissional a outros Irmãos. Vale revisar a finalidade declarada vs. o uso efetivo.
- Controle de visibilidade granular por bloco (`PublicationSettings`), com separação técnica entre campos que o titular controla e campos que só o Admin altera (ex.: suspensão).
- **`publicationConsents`** é o registro formal de consentimento (grant/revoke) para publicação — append-only, é a peça mais próxima de "prova de consentimento LGPD" que o sistema já produz.

### 3.4 Constelação VL6

Camada de visualização/navegação sobre dados já existentes (Acervo, Membership, Agenda) — não duplica dado pessoal, mas expõe a **rede de relações entre Irmãos**. Ponto de atenção: quadros com `visibility: 'shared'` podem ser abertos por link sem exigir autenticação do visitante como dono — recomenda-se confirmar se isso permite acesso não autenticado à rede de relacionamentos.

### 3.5 Comunidades Paramaçônicas (`paramasonicEntity`, `paramasonicEntityMember`)

- Cadastro da entidade em si (DeMolay, Filhas de Jó, Fraternidade Feminina etc.) não é dado pessoal.
- Integrantes (`ParamasonicEntityMember`): nome, contato (quando não é um Irmão já cadastrado), cargo, categoria, situação — **frequentemente menores de idade** (jovens de 12–21 anos), sem campo formal de data de nascimento/controle de consentimento parental visível no modelo.
- `conjugeDeMemberId` vincula uma integrante (tipicamente esposa) a um Irmão — **nunca removido**, mesmo após separação/divórcio (só marcado inativo) — retenção indefinida de dado de relacionamento de terceiro.
- Diretório reduzido para convidados paramaçônicos já aplica minimização de dados por design (exclui grau, situação, datas maçônicas, contatos, endereço, honrarias).

### 3.6 Agenda, Eventos, Sessões e Notificações

- `Event`/`EventAttendance`: dados de frequência/presença em sessões e eventos. Qualquer usuário com `event:read` (todo `membro`) pode ver a lista de presença de outros Irmãos — inclusive, potencialmente, em sessões de grau reservado (não confirmado filtro adicional por grau).
- Agenda pessoal (`PersonalEvent/Task/Note`) é estritamente privada por dono, nunca visível a Admin/outros Irmãos — inclusive apagada no fluxo de exclusão de conta.
- `Notification`: canal interno sempre persistido; e-mail/WhatsApp/Telegram/push usam contato já cadastrado em `Member`. **Única coleção do sistema com retenção automática codificada**: arquivada ao expirar e **excluída fisicamente** 7 dias depois (`PurgeExpiredNotificationsUseCase`).
- Cron `birthday-reminder` varre todos os tenants e cria eventos com o **nome do Irmão aniversariante no título**, visíveis a todo `event:read` da Loja (não só ao próprio Irmão).

### 3.7 Storage, Acervo, Biblioteca, Galeria, Downloads, QR Codes

- **Infra real:** Vercel Blob (`access: public`), não Firebase Storage — migração documentada no próprio código. Todo blob fica em URL pública; a única proteção é o UUID do path não ser adivinhável.
- **Controle de acesso:** feito por rotas proxy autenticadas (`/api/files/[fileId]`, `/api/archive-media/[archiveMediaId]`, `/api/gallery-media/[mediaId]`) que verificam sessão + permissão + tenant antes de fazer stream do binário — a URL real do Blob nunca chega ao cliente **para esses casos**. Porém, **fotos de perfil, de familiares e capas usam URL direta do Blob** (campos `fotoUrl`/`capaUrl`), efetivamente públicas por design.
- **Uploads mapeados:** foto de perfil do Irmão, anexos de situação maçônica (documentos), foto de familiar (inclui menores/falecidos), capa e arquivo digital de livro da Biblioteca, mídia do Acervo Histórico, contribuições da comunidade, capa de evento, logo de negócio, foto "hero" institucional.
- **Identificação de pessoas em fotos do Acervo é manual** (`ArchiveMedia.pessoasIdentificadas`, admin marca `Member.id`) — **não há reconhecimento facial automático** nem extração de EXIF (a compressão client-side em `<canvas>` descarta metadado, incidentalmente).
- **Direitos autorais/licenciamento: lacuna confirmada.** Existe apenas um campo `autor` (texto livre) em mídia do Acervo, arquivos e itens de Biblioteca — nenhum campo estruturado de licença, cessão de direitos ou autorização de uso. Contribuições enviadas por Irmãos ao Acervo não têm checkbox de autorização de uso/cessão no fluxo atual. **Este é o principal gap técnico a cobrir por cláusula contratual nos Termos de Uso.**
- **QR Codes não carregam dado pessoal** — só codificam a URL da agenda (atalho de PWA) ou o ID de um exemplar físico da Biblioteca (etiqueta).
- **Downloads:** o sistema mede contagem agregada de visualizações/downloads por arquivo, mas **não mantém log individual de quem baixou o quê**.
- **Retenção de arquivos:** exclusão é sempre lógica (soft delete / `deletedAt`); o binário no Vercel Blob **permanece armazenado indefinidamente** mesmo após "exclusão" do registro — não há rotina de purga de blobs órfãos ou expirados.

### 3.8 Auditoria, logs e backup

- **`auditLogs`** (append-only, nunca editado/apagado): registra `entidade`, `ação`, `usuarioId`, snapshot completo (`valorAnterior`/`valorNovo`) de ~25 coleções, incluindo todo o cadastro pessoal (`members`, `familyPersons`, `memberCentralProfiles` etc.). **Sem TTL/expurgo** — retém indefinidamente dados pessoais mesmo depois de soft-deleted na coleção original. Campos `ip`/`dispositivo` existem no schema mas **nunca são preenchidos** (sempre `null`).
- **Backup diário** (`daily-backup`): dump JSON de ~27 coleções (inclui `users`, `members`, `auditLogs`) para o Vercel Blob, todo dia, **sem expurgo automático** — cresce indefinidamente. A lista de coleções copiadas está desatualizada frente ao modelo atual (não inclui, por exemplo, `memberCentralProfiles`, `familyPersons`, `googleCalendarConnections`).
- **Logs de aplicação:** logger estruturado interno (JSON em stdout, consumido pela plataforma de hosting) registra `ip`, `uid`, `tenantId` em eventos de auth — nunca senha/token em claro. Sentry (condicional a variável de ambiente) captura exceções e pode reter IP/uid indiretamente via stack traces — deve constar como subprocessador se DSN estiver ativa em produção.
- **Rate limiting** de login (10/5min) e de autorreivindicação (5/min) é **em memória, por processo** — não é efetivamente global em ambiente serverless (Vercel escala múltiplas instâncias), o que enfraquece a proteção nominal contra força bruta.

### 3.9 Armazenamento no navegador (cliente)

| Mecanismo | Conteúdo | Duração | Dado pessoal? |
|---|---|---|---|
| Cookie `__vl6_session` | Session cookie do Firebase Auth, HttpOnly | 5 dias | Indireto (uid) |
| `localStorage: vl6-library-cart` | IDs de itens de Biblioteca no carrinho | Até finalizar pedido/limpar navegador | Não diretamente |
| Cache do Service Worker (PWA) | Shell estático + páginas HTML já visitadas | Até nova versão do app | Possivelmente sim (páginas podem renderizar dado pessoal) |
| Cache do React Query | Respostas de dados da sessão atual | Em memória, até fechar aba (30s de *stale time*) | Sim, temporariamente |
| IndexedDB | Nenhum uso direto do Portal (só uso interno do SDK do Firebase) | — | — |
| Analytics/telemetria de produto | **Nenhuma** (sem GA/Firebase Analytics/PostHog/Mixpanel) | — | — |

Não há cookies de terceiros, publicidade ou rastreamento entre sites.

---

## 4. Dados sensíveis, de terceiros e de menores — pontos de maior atenção

1. **Filiação/convicção filosófica (Maçonaria):** grau, trajetória, Grau Filosófico. Um módulo (`philosophicalJourney`) já trata isso como dado sensível por design (campo `visivel`, default `false`); o restante do cadastro maçônico (`Member.grau`, datas, situação) não tem o mesmo tratamento diferenciado, embora seja da mesma natureza.
2. **Dados de cônjuge e filhos:** tratados como dado de terceiro coletado pelo titular (o Irmão), sem mecanismo de consentimento próprio do cônjuge/filho. Nome e aniversário aparecem no Diretório interno **sem gate de opt-in**, ao contrário do restante do perfil.
3. **Dados de menores de idade:** filhos do Irmão (`Member.filhos`), integrantes de entidades paramaçônicas (DeMolay, Abelhinhas), e `FamilyPerson.menorDeIdade`. Só este último tem controle técnico de visibilidade restrita já implementado; os outros dois não.
4. **Dados de saúde/óbito indiretos:** `dataFalecimento`, `mensagemHomenagem` (In Memoriam), anexos de `MemberSituationRecord` (podem incluir atestados/certidões).
5. **Dado de relacionamento retido indefinidamente:** vínculo de cônjuge sincronizada com Fraternidade Feminina nunca é removido, mesmo após separação.
6. **Compartilhamento com terceiros:** API `/api/v1/members` expõe nome, e-mail, cidade e dados maçônicos a integrações externas autenticadas por API Key — deve ser mapeado como transferência de dados a operadores/parceiros.
7. **Imagem de pessoas em fotos históricas/galeria:** sem campo de consentimento de imagem por foto.

---

## 5. Bases legais candidatas (a validar com jurídico)

| Categoria de dado | Base legal provável (LGPD art. 7º/11) |
|---|---|
| Cadastro civil básico (nome, contato, endereço) | Execução de política institucional por associação / legítimo interesse |
| Dados de trajetória maçônica e grau | Execução da finalidade da associação — **avaliar se exige consentimento explícito por analogia a dado sensível** |
| Dados de cônjuge/filhos (lembrete) | Legítimo interesse limitado à finalidade (minimizado a dia/mês) — **validar necessidade de aviso ao titular terceiro** |
| Dados de menores (paramaçônica, família) | Consentimento específico de responsável legal — **não identificado tecnicamente hoje** |
| Perfil voluntário / Central VL6 / negócios | Consentimento (opt-in já implementado via `publicationConsents`) |
| Auditoria e segurança | Cumprimento de obrigação legal / exercício regular de direitos / legítimo interesse |
| Backup | Legítimo interesse (continuidade de negócio) — **exige prazo de retenção definido** |

---

## 6. Riscos priorizados (segurança + LGPD)

**Altos**
- [R1] `auditLogs` e backups diários retêm dado pessoal sensível indefinidamente, sem expurgo, inclusive após exclusão lógica do dado original.
- [R2] Dados de cônjuge/filhos expostos a todo o Diretório sem controle de opt-in, apesar de serem dado de terceiro/menor.
- [R3] Ausência de campo de licenciamento/consentimento de uso de imagem/documento em contribuições ao Acervo e Biblioteca.
- [R4] Exclusão de conta não cobre o cadastro institucional (`Member`) nem os registros de auditoria — direito de eliminação (art. 18 LGPD) só parcialmente atendido.
- [R5] Regra do Firestore permite ao próprio Irmão sobrescrever qualquer campo do seu documento `members` (inclusive `situacao`, `grau`, `cim`) via acesso direto ao SDK — falha de integridade, não só de confidencialidade.

**Médios**
- [R6] Rate limiting de login/autorreivindicação é em memória por processo — ineficaz em ambiente serverless com múltiplas instâncias.
- [R7] Senha mínima de 6 caracteres no fluxo de autorreivindicação de conta.
- [R8] CNPJ usado para cruzar/expor rede profissional entre Irmãos além da finalidade declarada de "achar colega".
- [R9] Fotos de perfil/familiares em URL pública direta do Vercel Blob (não passam por proxy autenticado).
- [R10] API pública `/api/v1/members` compartilha dados pessoais com integrações externas sem mapeamento formal como transferência a terceiros.

**Baixos / de processo**
- [R11] Senha temporária de convite/reset exibida em texto puro ao Admin, repassada por canal externo ao sistema.
- [R12] Campos `ip`/`dispositivo` do log de auditoria nunca são preenchidos, apesar de existirem no schema — lacuna de rastreabilidade.
- [R13] Comentários desatualizados no `firestore.rules` mencionando Cloud Functions inexistentes (risco de confusão em auditorias futuras, não de dados).

---

## 7. Boas práticas já identificadas no código

- Senha nunca trafega nem é persistida pela aplicação (delegada ao Firebase Auth).
- Autorreivindicação de conta expõe publicamente **só o nome** do Irmão (nunca CIM, e-mail, telefone) e usa mensagem de erro genérica para dificultar enumeração.
- Diretório reduzido para convidados paramaçônicos já aplica minimização de dados por design.
- Perfil voluntário da Central VL6 "nasce vazio" e é opt-in por padrão, com registro formal de consentimento (`publicationConsents`) apartado do cadastro administrativo.
- `FamilyPerson.menorDeIdade` já força visibilidade restrita por regra de schema.
- Tokens OAuth do Google Calendar são armazenados cifrados (AES-256-GCM).
- Identificação de pessoas em fotos é manual, nunca por reconhecimento facial automático.
- Notificações têm política de retenção explícita com exclusão física após período de carência.
- MIME real dos arquivos é validado no servidor (não confia no tipo declarado pelo formulário).
- Documentos sensíveis (Acervo, Arquivos, Biblioteca digital) passam por proxy autenticado que nunca expõe a URL pública do Blob ao cliente.

---

## 8. Lacunas a resolver antes de finalizar Política de Privacidade e Termos de Uso

1. Definir prazo de retenção explícito para `auditLogs` e para os backups diários (hoje: indefinido).
2. Decidir e formalizar a base legal para dados de cônjuge/filhos/menores, e avaliar se o Diretório interno deveria aplicar o mesmo gate de opt-in já usado para o restante do perfil.
3. Redigir cláusula de cessão/licenciamento de uso de imagem e documentos para o Acervo, Biblioteca e Galeria (hoje sem correspondente técnico).
4. Confirmar se CPF/RG são coletados em algum ponto fora do modelo de domínio mapeado.
5. Validar juridicamente a retenção do cadastro `Member` após exclusão da conta de acesso pelo titular.
6. Mapear formalmente a API `/api/v1/members` como compartilhamento de dados com terceiros/operadores no capítulo de compartilhamento da política.
7. Confirmar se o Sentry está ativo em produção (para constar como subprocessador).
8. Decidir se a Central de Solicitações (Termos e Privacidade) será majoritariamente manual (via Secretaria) até que existam rotinas automatizadas de exportação/eliminação completa por titular.

---

## 9. Referências rápidas (file:line)

- RBAC: `packages/shared/src/enums/rbac.ts`
- `Member`: `packages/domain/src/modules/membership/entities/member.entity.ts`
- Situação/Histórico: `packages/domain/src/modules/membership/entities/member-situation-record.entity.ts`
- Autorreivindicação: `apps/web/src/app/(auth)/reivindicar/`, `packages/domain/src/modules/membership/use-cases/claim-member-account.use-case.ts`
- Login/sessão: `apps/web/src/app/api/v1/auth/login/route.ts`, `apps/web/src/lib/auth/session.ts`, `session-constants.ts`
- Exclusão de conta: `packages/domain/src/modules/identity-access/use-cases/delete-my-account.use-case.ts`
- Auditoria: `packages/domain/src/modules/audit/entities/audit-log.entity.ts`, `packages/infra/src/audit/with-audit.ts`
- Consentimento de publicação: `packages/domain/src/modules/central/entities/publication-consent.entity.ts`
- Central/Negócios: `packages/domain/src/modules/central/entities/member-central-profile.entity.ts`, `.../use-cases/find-colleagues-by-cnpj.use-case.ts`
- Constelação: `packages/domain/src/modules/archive/entities/constellation-view.entity.ts`
- Família e Legado: `packages/domain/src/modules/family-legacy/entities/family-person.entity.ts`, `paramasonic-entity-member.entity.ts`
- Storage (Vercel Blob): `packages/infra/src/vercel/blob-storage-adapter.ts`, `apps/web/src/app/api/files/[fileId]/route.ts`, `apps/web/src/app/api/archive-media/[archiveMediaId]/route.ts`
- Backup diário: `apps/web/src/app/api/cron/daily-backup/route.ts`
- Notificações e retenção: `packages/domain/src/modules/notification/entities/notification.entity.ts`, `purge-expired-notifications.use-case.ts`
- Cron jobs: `apps/web/src/app/api/cron/*`
- Firestore Rules: `firestore.rules`

---

*Próximo passo sugerido: usar este inventário como base factual para redigir a Política de Privacidade e os Termos de Uso definitivos (substituindo o conteúdo ilustrativo do mock-up), e para dimensionar o sistema de versionamento/aceite descrito na área "Termos e Privacidade" do Portal.*
