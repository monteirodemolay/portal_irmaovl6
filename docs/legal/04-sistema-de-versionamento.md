# Sistema de Versionamento — Termos de Uso e Política de Privacidade

> Especificação técnica de como a Política de Privacidade (`02-politica-privacidade.md`) e os Termos de Uso (`03-termos-de-uso.md`) permanecem sincronizados com o comportamento real do Portal, com histórico permanente, aceite auditável e notificação de mudanças. Complementa o mock-up funcional já validado (área "Termos e Privacidade" do perfil).
>
> Este documento segue o padrão de modelagem já usado no Portal para dados que exigem trilha imutável (`auditLogs`, `publicationConsents` — ver `docs/legal/01-inventario-dados-lgpd.md` §3.8), evitando reinventar um segundo padrão de auditoria.

## 1. Numeração de versão

Antes da semântica de versões, o sistema reconhece uma classificação histórica especial: **Marco Inicial**. Toda versão `1.0.0` publicada como primeira versão de um documento é exibida no histórico como Marco Inicial, ainda que o registro legado tenha sido persistido com a classificação técnica `mudanca_institucional`. O registro original não é alterado; apenas sua apresentação institucional é normalizada.

Semântica `MAJOR.MINOR.PATCH`, aplicada independentemente a cada documento (Política e Termos têm numeração própria):

- **MAJOR** — mudança jurídica ou de tratamento de dados que exige novo aceite dos usuários (ex.: nova finalidade, novo compartilhamento com terceiro).
- **MINOR** — nova funcionalidade do Portal que passa a ser coberta pelo documento, sem mudar direitos/obrigações existentes (ex.: lançamento de um módulo novo).
- **PATCH** — correção de redação, ajuste de clareza, correção de erro material, sem mudança de sentido.

Cada versão carrega uma classificação obrigatória (mesmo enum sugerido no pedido original): `correcao | adequacao | nova_funcionalidade | mudanca_juridica | mudanca_operacional | mudanca_seguranca | mudanca_lgpd | mudanca_institucional`.

## 2. Modelo de dados proposto

Duas coleções novas no Firestore, seguindo o padrão já usado por `auditLogs`/`publicationConsents` (append-only, sem update/delete):

```
legalDocumentVersions/{id}
  tenantId
  documento: 'politica_privacidade' | 'termos_uso'
  versao: string            // "1.2.0"
  dataPublicacao: timestamp
  autor: string             // uid de quem publicou
  responsavel: string       // nome/cargo institucional
  classificacao: enum       // ver seção 1
  motivo: string
  impacto: 'baixo' | 'medio' | 'alto'
  itensAlterados: string[]
  exigeNovoAceite: boolean
  conteudoMarkdown: string  // snapshot completo do texto publicado
  diffResumo: string        // resumo gerado para o banner/notificação
  status: 'rascunho' | 'em_aprovacao' | 'publicado'
```

```
legalDocumentAcceptances/{id}
  tenantId
  userId
  documento: 'politica_privacidade' | 'termos_uso'
  versaoAceita: string
  aceitoEm: timestamp
  ip: string
  userAgent: string
  dispositivo: string
  hashVersao: string   // hash do conteúdo da versão aceita, para prova de integridade
```

Ambas as coleções: `allow write: if false` nas Firestore Rules (escrita só via Admin SDK/Server Action), `allow read` restrito ao próprio usuário (para `legalDocumentAcceptances`) ou a quem tiver `legalDocument:read`/`legalDocument:manage`. Nunca há `update`/`delete` — cada mudança é um novo documento, exatamente como já ocorre em `publicationConsents`.

**Observação de reaproveitamento:** a coleção `legalDocumentAcceptances` é estruturalmente idêntica ao padrão já validado em `publicationConsents` (`packages/domain/src/modules/central/entities/publication-consent.entity.ts` — ver auditoria §3.3). Recomenda-se implementar seguindo o mesmo `use case`/repositório, só trocando o domínio.

## 3. Fluxo de aceite no cadastro

1. No cadastro (autorreivindicação ou convite), a tela final exige dois checkboxes independentes: "Li e concordo com os Termos de Uso" e "Li e estou ciente da Política de Privacidade", cada um linkando para a versão vigente.
2. A conta só é criada após ambos marcados — a Server Action de criação de usuário passa a exigir, como pré-condição, um registro em `legalDocumentAcceptances` para as duas versões vigentes no momento (mesma transação/lote da criação da conta).
3. O registro grava IP e User-Agent capturados na própria requisição (o mesmo padrão de captura de IP já usado no rate limiter de login, `apps/web/src/lib/api/get-client-ip.ts`).

## 4. Fluxo de alteração dos documentos

Sempre que uma versão é publicada:

1. Nunca sobrescreve a anterior — cria um novo documento em `legalDocumentVersions` com `status: 'publicado'` e mantém os anteriores intactos.
2. Se `exigeNovoAceite: true`, todo usuário cuja `legalDocumentAcceptances` mais recente aponte para uma versão anterior passa a ser sinalizado como pendente (calculado em tempo de leitura, comparando a versão aceita com a versão vigente — sem necessidade de tabela de "pendências" separada).
3. Dispara notificação interna (reaproveitando a coleção `notifications` já existente — `tipo: 'legal_update'`) para os usuários pendentes.
4. Um banner aparece após o login (já prototipado no mock-up) até que o usuário revise e aceite a nova versão.

## 5. Manutenção contínua (detecção de impacto)

### Processo por marcos de commit

Cada revisão jurídica deve registrar dois pontos objetivos:

1. **Marco jurídico anterior** — commit do repositório no qual a última auditoria jurídica foi encerrada.
2. **Marco técnico revisado** — commit efetivamente em Production usado como limite final da comparação.

A revisão analisa somente o intervalo entre esses marcos, classifica cada alteração como sem impacto jurídico, atualização documental sem novo aceite ou alteração material com novo aceite, e grava os dois SHAs nos itens alterados da nova versão. O arquivo `docs/legal/05-marcos-revisao.md` mantém a trilha consolidada. Branches e PRs ainda não publicados em Production ficam fora do marco e entram na revisão seguinte depois de publicados.

Processo institucional (não totalmente automatizável hoje, dado que não há Cloud Functions/triggers em produção — ver auditoria §2):

1. Ao planejar uma funcionalidade nova ou uma mudança relevante no tratamento de dados, quem a especifica preenche um checklist de impacto em LGPD (seções afetadas da Política/Termos, novo dado coletado, novo compartilhamento).
2. Esse checklist gera um rascunho de nova versão (`status: 'rascunho'`) na coleção `legalDocumentVersions`, com o `diffResumo` preenchido manualmente ou semi-assistido.
3. Um administrador com `legalDocument:manage` revisa e move o rascunho para `em_aprovacao` e depois `publicado`.
4. A publicação dispara o fluxo da Seção 4.

**Nota de escopo:** como o Portal não roda Cloud Functions (plano Firebase Spark), a "detecção automática" de impacto mencionada no pedido original deve ser implementada como uma rotina de cron (mesmo padrão dos jobs existentes em `apps/web/src/app/api/cron/*`) que compara o schema de dados entre deploys, ou como parte do processo de revisão de código (checklist em PR), não como um trigger reativo em tempo real.

## 6. Área "Termos e Privacidade" (perfil do Irmão)

Já especificada e prototipada no mock-up funcional (artifact publicado na conversa). Consome diretamente as duas coleções acima:

- Política e Termos vigentes → última versão com `status: 'publicado'` de cada documento.
- Histórico completo → listagem de `legalDocumentVersions` por documento, ordenada por versão.
- Meu aceite → última `legalDocumentAcceptances` do usuário logado, por documento.
- Comparação entre versões → diff entre dois `conteudoMarkdown` (pode usar uma lib de diff de texto no servidor; o mock-up usa diffs pré-computados apenas para demonstração).
- Central de solicitações → formulário que cria uma solicitação (nova coleção `privacyRequests`, com o mesmo padrão de auditoria) encaminhada à Secretaria, já que hoje não há atendimento automatizado de exportação/eliminação (ver auditoria §8, item 8).

## 7. Estado da implementação (atualizado em 22/09/2026)

Implementado, com código real no `apps/web`/`packages/*` (não é mais só especificação):

- Coleções `legalDocumentVersions` e `legalDocumentAcceptances` no Firestore, com regras append-only análogas a `publicationConsents` (`firestore.rules`), e índices compostos em `firestore.indexes.json`.
- Domínio: `LegalDocumentVersion`/`LegalDocumentAcceptance` (entidades), `PublishLegalDocumentVersionUseCase`, `ListLegalDocumentVersionsUseCase`, `GetLegalAcceptanceStatusUseCase`, `RecordLegalAcceptanceUseCase` — todos com testes unitários (`packages/domain/src/modules/legal/`).
- RBAC: recurso `legalDocument` (`read` para todo papel com acesso ao Portal, `manage` só Administração) em `packages/shared/src/enums/rbac.ts`.
- Aceite obrigatório no cadastro: `claimMemberAccountAction` (`apps/web/src/modules/membership/actions/claim-actions.ts`) agora bloqueia a criação da conta sem as duas versões vigentes aceitas, e grava IP/User-Agent/hash no mesmo fluxo.
- Gate de reaceite: `(member)/layout.tsx` redireciona qualquer Irmão com pendência para a área real "Termos e Privacidade" (`/irmaos/configuracoes/termos-e-privacidade`), que lê e grava dados de verdade (não é mais o mock-up isolado).
- Leitura pública (pré-login) dos documentos vigentes em `/termos/politica-privacidade` e `/termos/termos-uso`.
- Script de bootstrap `scripts/seed-legal-documents.ts` publica a v1.0.0 a partir de `02-politica-privacidade.md`/`03-termos-de-uso.md`.
- **Painel administrativo** (`/admin/configuracoes/termos-e-privacidade`, permissão `legalDocument:manage`) — lista todo o quadro de Irmãos com o status de aceite de cada documento (em dia/pendente/versão/data), e uma tela de histórico completo por Irmão (`/admin/configuracoes/termos-e-privacidade/[userId]`) com todas as versões já aceitas, hash, IP/User-Agent e origem (`self_service` vs `migracao_pre_existente`, ver §8). Só a Administração enxerga o aceite de outros Irmãos — cada Irmão continua só vendo o próprio, em `/irmaos/configuracoes/termos-e-privacidade`.
- **UI de administração para publicar novas versões** (`/admin/configuracoes/termos-e-privacidade/editar/[documento]`, mesma permissão `legalDocument:manage`) — formulário com o texto completo em Markdown (pré-preenchido com a versão vigente), versão semver sugerida automaticamente (incrementa o PATCH), classificação, impacto, motivo, itens alterados, resumo para o aceite e opção de exigir novo aceite. Publicar uma nova versão não exige mais rodar script nem chamar o Use Case diretamente — o formulário chama `PublishLegalDocumentVersionUseCase` (`legal-admin-actions.ts`) e, quando marcado "exigir novo aceite", já dispara `notifyAllActiveUsers` automaticamente na mesma Server Action (o gap descrito no fim deste documento está fechado para esse caminho; só continua valendo para quem publicar via script/Use Case direto).
- **Leitura do texto completo em painel na própria página** — a área "Termos e Privacidade" do Irmão abre o texto integral num Drawer (mesma página), em vez de navegar para `/termos/[documento]` em nova aba; as páginas públicas `/termos/politica-privacidade` e `/termos/termos-uso` continuam existindo à parte, para o fluxo de reivindicação de conta (pré-login).

Ainda NÃO implementado (trabalho futuro, não confundir com o que está pronto):

- **Detecção automática de impacto** ao alterar código (checklist de PR/cron) — item 5 continua sendo processo institucional, não automação.
- **Comparação visual entre versões** (diff) na área "Termos e Privacidade" — a página mostra o histórico completo, mas não um diff lado a lado.
- **Central de solicitações** (exportação/eliminação sob pedido) — continua manual, via Secretaria; não há formulário nem coleção `privacyRequests` implementada.

## 8. Aceite de contas pré-existentes (migração institucional)

Quando a v1.0.0 foi publicada, 6 contas já existiam e estavam em uso normal do Portal desde antes do sistema de aceite existir. Duas opções foram consideradas: (a) forçar cada uma a passar pelo gate de reaceite no próximo login, ou (b) reconhecer institucionalmente que essas contas já usam o Portal e conceder o aceite administrativamente. A Loja optou pela opção (b).

Para isso, `LegalDocumentAcceptance` ganhou o campo `origem: 'self_service' | 'migracao_pre_existente'`:

- `self_service` — o próprio usuário marcou os checkboxes e confirmou; `ip`/`userAgent` refletem a requisição real.
- `migracao_pre_existente` — concedido administrativamente para uma conta que já existia antes da versão em questão ser publicada; `ip`/`userAgent` ficam sempre `null` (nunca fabrica uma ação que não aconteceu).

**Importante:** isso não é o comportamento padrão para toda versão nova — só se aplica à migração pontual das contas que já existiam quando o sistema de aceite entrou no ar. A partir da v1.0.0 em diante, qualquer novo aceite (inclusive de reaceite de uma versão futura) segue `self_service`, gravado pelo próprio Use Case (`RecordLegalAcceptanceUseCase`) a partir de uma ação real do usuário.

### Incidente relacionado (RBAC não sincronizado)

A publicação também expôs um problema separado: `legalDocument:read`/`legalDocument:manage` foram adicionados ao vocabulário de permissões (`packages/shared/src/enums/rbac.ts`), mas os papéis (`roles`) e os Custom Claims de usuários **já existentes no tenant não recebem chaves de permissão novas automaticamente** — isso já era um comportamento documentado do sistema (`SyncSystemRolePermissionsUseCase`), mas ninguém rodou a sincronização depois do deploy, causando erro (`ForbiddenError`) ao carregar a área "Termos e Privacidade" para todo Irmão do tenant. Corrigido rodando `SyncSystemRolePermissionsUseCase` para os 4 papéis do sistema e `syncUserClaims` para os 6 usuários. **Lição para futuras permissões novas:** depois de adicionar uma chave ao RBAC, rodar a sincronização de papéis/claims do tenant faz parte do deploy, não é opcional.

Adicionado também um error boundary dedicado (`apps/web/src/app/(member)/error.tsx`) para que um erro de permissão nesse estilo não resulte em página em branco, e sim numa mensagem com botão de "Tentar novamente".

**Nota (superada por §7):** o `PublishLegalDocumentVersionUseCase` continua sem disparar `notifyAllActiveUsers` sozinho — isso é responsabilidade de quem chama o Use Case. A UI de administração (`/admin/configuracoes/termos-e-privacidade/editar/[documento]`) já aciona a notificação quando "exigir novo aceite" está marcado; só publicar via script/Use Case direto ainda exige disparar a notificação manualmente.

## 9. Registro de alteração — 24/09/2026

### 1.1.0 — Integração automática Notícias ↔ Acervo

- **Classificação:** `nova_funcionalidade` / `mudanca_operacional`
- **Impacto:** baixo
- **Motivo:** permitir que notícias institucionais vinculadas a Eventos/Sessões preservem automaticamente no Acervo VL6 suas fotos, vídeos diretos e documentos, sem confundir a data editorial da matéria com a data histórica do acontecimento.
- **Itens alterados:** Inventário LGPD §3.7; Política de Privacidade §17.2; Termos de Uso §8.2-A.
- **Novo terceiro/subprocessador:** não. O armazenamento continua no Vercel Blob já declarado.
- **Nova finalidade:** não; trata-se de extensão operacional da finalidade já declarada de preservação da memória histórica institucional.
- **Exige novo aceite:** **não**. A mudança não amplia a finalidade, não cria novo compartilhamento externo e não altera direitos/obrigações dos usuários; documenta uma nova forma técnica de incorporar ao Acervo conteúdo institucional já publicado pela própria Loja.

## 10. Registro de alteração — 29/09/2026

### 1.2.0 — Nome do autor exibido nos comentários de Notícias + moderação notificada

- **Classificação:** `nova_funcionalidade` / `mudanca_operacional`
- **Impacto:** baixo
- **Motivo:** os comentários em notícias institucionais já existiam no Portal (`NewsComment`), mas nunca haviam sido documentados nesta trilha; a exibição do nome do autor junto ao comentário aprovado e o disparo automático de notificação interna para os Administradores com `news:manage` a cada novo comentário pendente são o motivo direto desta atualização.
- **Itens alterados:** Inventário LGPD §3.6-A (nova); Política de Privacidade §8.5 e §10; Termos de Uso §6.
- **Novo terceiro/subprocessador:** não — a notificação usa a coleção `notifications` já existente, sem canal externo novo.
- **Nova finalidade:** não. O comentário sempre foi atribuído a um autor (`autorId`) e qualquer Irmão autenticado já vê o nome completo de qualquer outro Irmão em todo o Portal (Diretório interno, §3.2 do Inventário) — exibir o nome junto ao comentário aprovado não cria uma categoria de exposição nova, só documenta uma que já existia sem registro formal.
- **Exige novo aceite:** **não**. Não há novo dado coletado, novo compartilhamento externo ou mudança de direitos/obrigações — é a formalização documental de uma exibição de dado já publicamente visível entre Irmãos autenticados em qualquer outra tela do Portal.

## 11. Marco de revisão — 30/09/2026

### 2.0.0 — Cripta Digital + transparência técnica consolidada

- **Marco jurídico anterior:** `24d09676532a91f82ef1a81801b58d9ce57be116` (29/09/2026).
- **Marco técnico revisado:** `1c699dd7f19cf04c80e85ea64f2214977cd742ab` (Production após PR #200).
- **Intervalo analisado:** 25 commits.
- **Fora do marco:** PR #201 / branch `fix/perfil-edicao-inline`, ainda não publicado em Production na data da revisão.
- **Política de Privacidade:** v2.0.0, classificação `mudanca_lgpd`, impacto alto.
- **Termos de Uso:** v2.0.0, classificação `nova_funcionalidade`, impacto alto.
- **Exige novo aceite:** **sim**, em ambos os documentos.
- **Motivo principal:** a Cripta Digital introduz cartas privadas, anexos, destinatários, armazenamento temporário no Wix, cifragem, custódia offline/externa e hipóteses excepcionais de abertura/entrega — categoria relevante de tratamento que não existia no Marco Inicial.
- **Outras adequações consolidadas:** comentários moderados em Notícias; integração automática Notícias ↔ Acervo; centralização de privacidade do Perfil em Configurações; preferências locais de aparência/acessibilidade e cookie funcional de tema; novo fluxo visual de aceite.
- **Novo subprocessador documentado:** Wix Media Manager, limitado ao ciclo operacional da Cripta.
- **Nova finalidade:** sim, guarda privada de mensagens/cartas pessoais na Cripta.
- **Resultado:** revisão preparada automaticamente no painel administrativo. A Administração revisa e publica, sem reconstruir manualmente versão, classificação, motivo, itens alterados ou resumo.

O próximo ciclo de auditoria deve começar no commit que efetivamente entrar em Production contendo esta revisão jurídica, e não no SHA de uma branch/PR ainda pendente.

## 12. Registro de alteração — 03/10/2026

### 2.1.0 — Ficha da carta (modo de entrega e retenção) e registro permanente das cerimônias da Cripta

- **Classificação:** `mudanca_operacional` (ficha da carta) + `mudanca_lgpd` sem exigência de aceite (registro de cerimônia) — ver justificativa abaixo.
- **Impacto:** baixo.
- **Motivo:** (a) o Irmão passou a poder, em qualquer reabertura do recebimento, rever o modo de entrega de uma carta já selada (privada/sessão/ambas) e reter sua entrega, sem decifrar o conteúdo e sem justificar — implementado via `docs/architecture/cripta-reabertura-ficha-e-cerimonia.md`, seções 1–2; (b) a Loja passou a manter registro permanente de presença e resultado do sorteio dos Guardiões em cada cerimônia (Inauguração/Abertura/Fechamento/Reabertura), para auditoria e para os anais — seções 2–4 do mesmo documento.
- **Itens alterados:** Inventário LGPD §3.9 (Cripta Digital VL6, dois novos itens); Política de Privacidade §8.9, §15 (tabela de retenção) e §17.5; Termos de Uso §10-A.
- **Novo terceiro/subprocessador:** não.
- **Nova finalidade:** não, no sentido jurídico — (a) é um mecanismo de controle do próprio titular sobre um dado que ele mesmo gera (amplia autonomia, não cria exposição nova a terceiros); (b) é equivalente, em natureza, ao registro de ata de sessão que a Loja já mantém para outras cerimônias, agora formalizado para a Cripta.
- **Exige novo aceite:** **não**. Em (a), o Irmão só ganha um controle adicional sobre seus próprios dados — nenhuma obrigação ou exposição nova lhe é imposta. Em (b), o dado gravado (presença e resultado de sorteio por nome) é da mesma natureza de dado de participação em sessão já coberto pelos Termos (comparecimento a eventos, §3.6 do Inventário) — não é conteúdo de carta, não é dado da ficha de nenhum Irmão, e não cria compartilhamento com terceiro externo à Loja.

## 13. Registro de alteração — 03/10/2026 (continuação)

### 2.2.0 — Rastreamento das partes dos Guardiões (válida/comprometida)

- **Classificação:** `mudanca_operacional`.
- **Impacto:** baixo.
- **Motivo:** Shamir's Secret Sharing não permite revogar uma parte tecnicamente — perder confiança em uma parte (Guardião falecido, impedido, pen drive extraviado ou retido) só pode ser resolvido de verdade por uma cerimônia de Renovação (reconstruir a chave, gerar uma nova, reselar cartas pendentes, redistribuir partes novas). Antes disso, a Loja precisa de um contador institucional de quantas partes ainda confia, com alerta antes de chegar ao limiar (3 de 5) — documentado em `docs/architecture/cripta-reabertura-ficha-e-cerimonia.md` §10. A cerimônia de Renovação em si (a parte que reconstrói/gera/reselada chaves) ainda não foi implementada; só o rastreamento e o alerta.
- **Itens alterados:** Inventário LGPD §3.9 (novo item: rastreamento das partes); Política de Privacidade §8.9.
- **Novo terceiro/subprocessador:** não.
- **Nova finalidade:** não — é extensão operacional do mesmo registro de cerimônia/custódia já declarado na v2.1.0, agora cobrindo o status de cada parte individualmente.
- **Atenção registrada:** o motivo (texto livre, opcional) que a Administração pode anotar ao marcar uma parte comprometida poderia, na prática, conter informação de saúde/óbito do Guardião, ainda que o campo não exija isso — recomendação operacional de preencher só a categoria (extravio/impedimento), não detalhe clínico, registrada no Inventário §3.9.
- **Exige novo aceite:** **não**. É dado administrativo sobre o exercício da função de Guardião, não dado pessoal geral do titular, e não cria finalidade nova nem compartilhamento externo.

## 14. Registro de alteração — 03/10/2026 (continuação)

### 2.3.0 — Lista de presença completa, exportação de elegíveis e notificação de nível crítico

- **Classificação:** `mudanca_operacional`.
- **Impacto:** baixo.
- **Motivo:** três itens pendentes do Architecture da Cripta, fechados por decisão institucional explícita: (a) Abertura/Fechamento passam a registrar, opcionalmente, a lista completa de presentes — incluindo, por decisão, Irmãos Ativos sem conta vinculada ao Portal, registrados por nome em texto livre; (b) a Administração pode exportar uma lista de Irmãos elegíveis para levar ao ambiente offline da Renovação de Guardiões, reduzindo erro de digitação; (c) quando as partes válidas dos Guardiões caem abaixo do limiar necessário, o Portal notifica automaticamente quem tem permissão `tenant:manage`, pela Central de Avisos já existente.
- **Itens alterados:** Inventário LGPD §3.9 (três novos itens); Política de Privacidade §8.9.
- **Novo terceiro/subprocessador:** não.
- **Nova finalidade:** não — (a) e (b) são extensão operacional do mesmo registro de cerimônia/custódia já declarado; (c) reaproveita a infraestrutura de notificação interna já existente e documentada para o Portal em geral, sem conteúdo pessoal novo na própria notificação.
- **Atenção registrada:** o item (a) é o único que introduz dado de pessoa até então sem nenhum registro de nome neste sistema (Irmão Ativo sem conta vinculada) — campo opcional, não bloqueia nenhum ato, e documentado como tal no Inventário §3.9.
- **Exige novo aceite:** **não**. Nenhum dos três cria finalidade nova, compartilhamento com terceiro externo, ou altera direito/obrigação de usuário — (a) é dado de participação em sessão (mesma natureza já coberta pelos Termos), (b) e (c) são puramente operacionais/administrativos.
