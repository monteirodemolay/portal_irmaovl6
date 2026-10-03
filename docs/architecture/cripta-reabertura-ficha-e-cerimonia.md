# Cripta do Irmão — ficha da carta, cerimônias e nova Administração

**Estado:** especificação de destino registrada em 2026-10-03, implementação em andamento por fases (ver seção 7). Substitui, quando concluída, o modelo administrativo descrito em `cripta-especificacao-funcional.md` seção 5 e o wizard único de `cycle-wizard.ts`. Não apagar os documentos anteriores: eles continuam valendo como histórico até cada fase abaixo estar em produção e verificada.

**Nota sobre risco de dados (2026-10-03):** confirmado com o Venerável que não há ainda cartas oficiais em custódia — a Cripta está em fase de testes. Isso reduz o risco de uma substituição mais ágil do wizard único (Fase 5), mas a disciplina de validar cada fase (tsc + eslint + vitest, revisão visual) antes de remover a anterior continua valendo por boa prática de engenharia, não por causa desse risco específico.

## 0. Por que este documento existe

O modelo até aqui tratava a Cripta como um ciclo único (inaugurar → abrir → lacrar → exportar → restaurar → reabrir), operado por um wizard administrativo linear. Três necessidades novas não cabem nesse modelo sem reformular a base:

1. **Reaberturas são recorrentes e permanentes**, não um evento raro — a Loja recebe Irmãos novos continuamente, então "reabertura" é o estado normal de operação, não uma exceção.
2. **O Irmão precisa agir sobre cartas já seladas sem decifrá-las** — reter uma entrega, mudar o modo de entrega, sem prestar contas a ninguém. Isso exige um dado que hoje não existe: uma representação em claro da carta, separada do conteúdo cifrado.
3. **A cerimônia (inauguração, sorteio de Guardiões, aberturas e fechamentos) precisa de registro permanente, auditável**, para o registro histórico da Loja — hoje nada disso é persistido, só o estado presente.

## 1. Princípio que não muda

O conteúdo de uma carta selada (título, corpo, anexos) permanece cifrado com a chave pública única da Cripta (ECDH P-256, dividida por Shamir em 5 partes / limiar 3) e **nunca** volta a ser legível pelo Portal, pelo servidor ou pelo próprio autor. Só os Guardiões, reunidos e offline, abrem — na entrega. Nenhuma peça deste documento reverte isso. Onde a necessidade do usuário parecia exigir o contrário ("as cartas têm que voltar"), a solução é sempre: mover a decisão para um metadado em claro ao lado do conteúdo, nunca abrir o conteúdo.

## 2. Ficha da carta (`criptaLetterRecordsV1`)

Documento novo, um por carta selada, guardado ao lado da cápsula cifrada (`criptaOnlineCapsulesV1`) — nunca dentro dela.

```
criptaLetterRecordsV1/{tenantId}/letters/{capsuleId}
  ownerUid: string
  label: string            // apelido escolhido pelo próprio Irmão ("minha esposa"); nunca o conteúdo da carta
  deliveryMode: 'privada' | 'sessao' | 'ambas'
  status: 'ativa' | 'retida'
  createdAt, updatedAt: string (ISO)
  supersedes?: string       // capsuleId da carta anterior, se esta a substitui
  history: Array<{ at: string; actorUid: string; action: 'criada' | 'retida' | 'reativada' | 'modo_alterado'; }>
```

Regras:

- `label` e `deliveryMode` são escolhidos pelo autor ao selar (`depositTest` em `cripta-experience.tsx`) e ficam visíveis **só para ele**, em qualquer reabertura futura — nunca para a Administração, nunca para outro Irmão.
- Mudar `status` para `retida` é uma ação de um clique, sem campo de justificativa obrigatório. `history` registra que aconteceu e quando, nunca o motivo (motivo é texto livre opcional, visível só ao próprio autor).
- Uma carta `retida` nunca é entregue, mesmo que o pacote físico ainda a contenha cifrada — a checagem de entrega offline consulta este registro como trava final.
- "Escrever carta nova para a mesma pessoa" cria uma nova ficha com `supersedes` apontando para a anterior; a Administração, ao montar o pacote de entrega, usa sempre a versão mais recente e não retida da cadeia.
- `deliveryMode: 'sessao'` e `'ambas'` cobre o pedido de homenagem póstuma — carta lida em Loja para todos, combinável com entrega privada.

### Rota necessária

`GET/PATCH /api/cripta/letter-records` — lista as fichas do Irmão autenticado (sem nunca tocar `criptaOnlineCapsulesV1`'s ciphertext) e aplica `retida`/`reativada`/`deliveryMode`. Disponível sempre que `isReceivingWindowOpen()` for verdadeiro — ou seja, em qualquer reabertura, não só na primeira abertura.

## 3. Log de cerimônia — reaproveitar o que já existe, preencher só a lacuna real

**Correção sobre a primeira versão deste documento**: a Administração já grava um evento append-only a cada ato relevante — não precisa de uma coleção nova paralela, que só criaria uma segunda fonte de verdade para manter sincronizada com a primeira. Isso já existe e já está em produção:

```
criptaCryptoV1/{tenantId}/events/{eventId}       // inauguração ('inaugurated')
criptaOnlineOpeningV1/{tenantId}/events/{eventId} // abertura/fechamento ('opened' | 'closed' | 'unsealed')
criptaSealsV1/{tenantId}/events/{eventId}         // lacração ('sealed')
```

Cada um já guarda `at`, `actorId`, ata (`minutes`), responsáveis (`masterId`, `presentMemberId`, `commissionMemberIds`) — append-only, nunca update/delete. Isso já é o "registro completo de tudo que aconteceu", só falta duas coisas:

**a) O sorteio dos Guardiões não existe como funcionalidade real** (só na maquete do Projetor) — hoje `guardianMemberIds` é digitado manualmente em `/cripta-administracao/inauguracao`. Nova rota `POST /api/cripta/ceremony-draw`: recebe os Irmãos presentes (Ativos, com conta vinculada — mesma fonte que `comissao-form.tsx` já usa, `repositories.member.search({ situacao: 'ativo' })`), sorteia 5 distintos com `node:crypto` (nunca `Math.random`), grava evento `sorteio.resultado` em `criptaCryptoV1/{tenantId}/events`, e permite `sortear de novo` (grava `sorteio.redraw`, preservando o resultado anterior, nunca o apagando). O resultado alimenta o formulário de inauguração já existente — a rota de inauguração em si não muda.

**b) Falta um leitor único que junte as três fontes em ordem cronológica**, para o Projetor e o relatório não lerem de três lugares cada. Nova rota de leitura `GET /api/cripta/ceremony-log?ceremony=inauguracao|abertura|fechamento|reabertura` — junta os eventos relevantes das três coleções acima (mais o novo `sorteio.*`), devolve em ordem, nunca grava nada.

## 4. Projetor — da maquete para dados reais

A maquete (`cripta-projetor-mockup.html`, versão 6) fixa o roteiro visual: 4 cerimônias (Inauguração — presença + sorteio com confirmar/sortear-de-novo; Abertura; Fechamento — incluindo a queima dos pen drives; Reabertura, clone estrutural da Abertura), o selo "Ato único" na Inauguração, e o aviso "Concluída — aguardando autorização" substituindo o botão morto "Próximo passo".

**Implementado (Fase 3, 2026-10-03):**

- `/cripta-projetor` (`page.tsx` + `projetor-screen.tsx`), tela cheia, gated por `tenant:manage` — lê `GET /api/cripta/ceremony-status` (fase atual do wizard, via `wizard-status.ts`, a mesma função que a Administração usa) e `GET /api/cripta/ceremony-log?ceremony=...` por polling de 5s. Zero dado mockado; sem rota de escrita própria — é um espectador puro.
- `POST /api/cripta/ceremony-draw` (Fase 2) calcula o sorteio no servidor com `node:crypto` — nunca no navegador do operador — e apoia "sortear de novo" sem apagar o resultado anterior.
- Pendente ainda desta fase: o roteiro completo da maquete (presença passo a passo, queima dos pen drives narrada) — a versão real cobre o essencial (fase atual + linha do tempo de eventos por cerimônia) e será enriquecida junto da Fase 5, quando a Administração em si passar a gravar presença como evento próprio.

## 5. Relatório para o registro histórico

**Implementado (Fase 4, 2026-10-03).** `GET /api/cripta/ceremony-report?ceremony=inauguracao|abertura|fechamento|reabertura`, gerado a partir do mesmo `eventsForCeremony` que o Projetor usa (`ceremony-events.ts`, extraído do antigo `ceremony-log/route.ts` para ser compartilhado pelos dois) — nunca uma segunda cópia a manter sincronizada. Resolve nomes de Irmãos só no momento do relatório (os eventos guardam só IDs), monta uma página HTML imprimível no estilo certidão/pergaminho da própria Cripta, com data, ato, participantes e ata de cada evento. Não contém conteúdo de carta nem a ficha de nenhum Irmão. Acessível pelo Projetor ("Abrir relatório desta cerimônia para o registro histórico").

## 6. Nova Administração — substitui o wizard único

O wizard linear de `cycle-wizard.ts` tratava reabertura como um loop de volta à etapa 2. Isso deixa de fazer sentido quando reabertura é o estado permanente esperado.

**Correção sobre a primeira versão deste documento, depois de reler o `page.tsx` atual:** ele já não tem o problema "ir pra frente e voltar" nem um botão "Próximo passo" morto — isso só existia na maquete do Projetor (corrigido na Fase 3). `page.tsx` já renderiza exatamente um bloco por `wizard.phase`, cada um com todas as suas ações visíveis de uma vez, sem navegação entre telas. A substituição necessária aqui é mais estreita do que a primeira versão deste documento previa:

**Implementado (Fase 5, 2026-10-03):**

- `InaugurationPanel` ganhou o sorteio real (seção com lista de presentes + "Sortear os Guardiões"/"Sortear de novo", chamando `/api/cripta/ceremony-draw`), preenchendo os 5 campos antes manuais — a lacuna real identificada na seção 3a. Só quem está marcado como presente pode ser sorteado; o servidor sorteia só dentro desse conjunto.
- `cycle-wizard.ts` ganhou `ceremonyForPhase`/`ceremonyStates`, dobrando as 8 fases do wizard nas 4 cerimônias (testado em `cycle-wizard.test.ts`) — fonte única usada tanto por `/cripta-administracao` quanto por `/cripta-projetor` (que antes tinha sua própria cópia local, com uma inconsistência: colocava `restaurar` em "Fechamento" em vez de "Reabertura" — corrigida ao dedupicar).
- `/cripta-administracao` reescrita como 4 cartões sempre visíveis (`ceremony-card.tsx`), cada um com seu próprio selo de estado (`Nunca realizada` | `Em andamento` | `Concluída — ...`) — não mais um único bloco condicional por fase. Inauguração carrega o selo "Ato único". Cabeçalho linka para `/cripta-projetor`.
- `restore-panel.tsx` mostra, só leitura, quantas fichas estão `retida` no momento (nunca quais) — para o operador saber que o pacote de entrega da Reabertura precisa respeitar essas retenções.

**Ainda pendente, fora do escopo desta fase:** ver seção 9.

## 9. Lacuna documentada — lista de presença só existe na Inauguração

Hoje, de verdade, só a Inauguração tem uma lista de presença real: o conjunto de Irmãos marcados como presentes alimenta o sorteio dos Guardiões (`ceremony-draw`) e cada um fica registrado no evento `sorteio.resultado`/`sorteio.redraw`.

Abertura e Fechamento **não têm isso**. `online-opening-control.tsx` só coleta um único `presentMemberId` — a pessoa que, com o Venerável, assina o ato para a ata (`criptaOnlineOpeningV1/{tenantId}/events`, campos `masterId`/`presentMemberId`/`commissionMemberIds`). Quem mais estava na sala nunca é registrado.

Isso é uma lacuna real para o registro histórico: o relatório de uma Abertura ou Fechamento (`/api/cripta/ceremony-report`) hoje só consegue nomear o Venerável e um integrante — não "quem compareceu à sessão".

### Implementado (2026-10-03) — decisão institucional: quem pode ser marcado, e obrigatoriedade

Decidido explicitamente: (a) qualquer Irmão Ativo pode ser marcado presente, mesmo sem conta vinculada ao Portal (não só quem tem conta, como no sorteio de Guardiões); (b) a lista é **opcional** — só enriquece a ata, nunca bloqueia abrir ou fechar.

- `OnlineOpeningControl` ganhou uma lista de checkboxes (Irmãos elegíveis, mesma fonte já usada) **mais** uma área de texto livre para "outros presentes sem conta vinculada" — um nome por linha, já que a decisão foi permitir quem não tem conta.
- `POST /api/cripta/online-opening` aceita `presentMemberIds: string[]` (subset de `choices`, deduplicado) e `presentOthers: string[]` (nomes livres, deduplicados, até 50) — ambos opcionais, sem quebrar o contrato existente (`presentMemberId`, o signatário, continua a única exigência).
- O evento gravado em `criptaOnlineOpeningV1/{tenantId}/events` ganhou os dois campos, ao lado do que já existia.
- `ceremony-report/route.ts` passou a juntar `presentOthers` (nomes já em claro, sem ID pra resolver) aos nomes resolvidos de `presentMemberIds` na coluna de participantes — sem precisar mudar `eventsForCeremony` nem o Projetor.
- Testado (`online-opening-route.test.ts`): a lista funciona, dedupe e filtra vazios, e abrir/fechar continua funcionando sem ela (campo ausente).

### Migração do `cycle-wizard.ts`

`computeCycleStatus` deixa de representar reabertura como "fase 2 de novo" e passa a expor as 4 cerimônias como estados independentes (cada uma com seu próprio `nunca | em andamento | concluída`), mantendo como hoje a regra de que Inauguração só acontece uma vez. Os testes existentes (`online-opening-route.test.ts`, `restore-route.test.ts`) continuam validando as rotas por trás; o que muda é a composição da tela, não os contratos de API já corretos.

## 7. Fases de implementação

A substituição é executada em fases, cada uma validada (tsc + eslint + vitest, e revisão visual antes de produção) antes de remover a tela anterior — nunca uma substituição única e irreversível sobre um sistema em produção com custódia real de cartas:

1. **Ficha da carta** (seção 2): schema + API + tela do Irmão. Base de tudo abaixo.
2. **Log de cerimônia** (seção 3): schema + API de escrita, instrumentar as rotas existentes (`online-opening`, `seal`, `restore`) para gravar eventos.
3. **Projetor real** (seção 4): nova rota lendo o log; mock-up retirado da navegação só depois de validado lado a lado com uma cerimônia real.
4. **Relatório para o registro histórico** (seção 5).
5. **Nova Administração** (seção 6): só então os componentes antigos do wizard único são removidos — depois que as 4 telas por cerimônia estiverem no ar e testadas, nunca antes.

## 8. Impacto em `docs/legal`

A ficha da carta introduz dado pessoal novo: `label` (apelido escolhido pelo Irmão), `deliveryMode` e `status` de retenção. O log de cerimônia introduz retenção permanente de presença e resultado de sorteio por nome. Ambos exigem atualização de `01-inventario-dados-lgpd.md`, da Política de Privacidade e um novo registro em `04-sistema-de-versionamento.md`, feita junto com a Fase 1 e a Fase 2 de código, não depois. Avaliação preliminar: nenhuma das duas exige novo aceite dos usuários (a ficha amplia o controle do próprio Irmão sobre seu dado; o log de cerimônia é equivalente a ata de sessão, já esperada) — a confirmar explicitamente ao usuário quando essa atualização for feita.

## 10. Renovação de Guardiões — o que acontece quando um Guardião falta, morre ou perde a parte

Shamir's Secret Sharing **não tem revogação nativa**: uma vez emitida, uma parte continua matematicamente capaz de ajudar a reconstruir a chave para sempre — marcar uma parte como não confiável é um registro institucional, não um bloqueio técnico. A única forma criptograficamente sólida de responder a um Guardião falecido, impedido, ou a um pen drive extraviado/retido pela família é uma 5ª cerimônia, a **Renovação**: reconstruir a chave atual com as partes ainda confiáveis (precisa de ≥ limiar), gerar uma chave nova, reselar as cartas pendentes sob ela, e dividir a chave nova em 5 partes novas para o quadro de Guardiões corrigido. A chave antiga, depois disso, não protege mais nada — reconstruí-la não serve pra nada, então a parte extraviada deixa de representar risco.

**Implementado agora — rastreamento e alerta** (sem tocar a ferramenta offline, que seria a parte que efetivamente executa a Renovação):

- `criptaCryptoV1.guardianShares: Array<{ memberId, status: 'valida' | 'comprometida' }>`, inicializado na própria Inauguração (`initialGuardianShares`) — um por Guardião, na mesma ordem de `guardianMemberIds`.
- `GET/PATCH /api/cripta/guardian-shares` — lê o quadro atual (nomes resolvidos, nunca partes), e permite à Administração marcar uma parte `comprometida` (com motivo livre opcional, só para registro interno) ou revertê-la, gravando sempre um evento (`parte.comprometida`/`parte.revalidada`) em `criptaCryptoV1/{tenantId}/events` — mesmo padrão append-only das demais cerimônias.
- Nível de alerta (`guardian-shares-shape.ts`, testado): `ok` (5/5) → `atencao` (4/5) → `urgente` (exatamente no limiar, 3/5 — ainda dá pra renovar, mas é a última margem) → `critico` (abaixo do limiar — tarde demais, a Cripta já ficou inacessível).
- Visível sempre (não ligado a uma cerimônia específica): painel permanente em `/cripta-administracao` (`guardian-shares-panel.tsx`) e selo no topo do `/cripta-projetor` quando o nível não é `ok`.

**Implementado (2026-10-03) — a ferramenta offline e o registro online, com confirmação explícita recebida antes de codificar:**

- `scripts/cripta/abertura-offline` ganhou a etapa 4, "Renovação de Guardiões": reunidas ≥ limiar partes (etapa 1, já existente) e lido o `.lacre` vigente (etapa 2, já existente), `reencryptAllLetters` decifra cada carta selada com a chave atual e resela sob uma chave nova (`generateRenewedKey`, mesmo `generateCriptaKeypair`/`splitSecret` da Inauguração) — uma por uma, isolando qualquer falha (se alguma carta não decifrar, nada é gerado, nenhuma parte antiga é dada por obsoleta até o problema ser resolvido). Rascunhos passam por `reencryptAllLetters` sem alteração (não usam a chave da Cripta). `buildRenewedLacre` monta o novo `.lacre` (mesmo formato CRIPTA/2, lido sem mudança nenhuma pelas ferramentas de Conferência física já existentes) com um novo `inventoryDigest` — calculado por um módulo isomórfico novo, `lacre-entry-digest.ts` (Web Crypto puro, nunca `node:crypto`, porque o bundle do navegador não pode incluí-lo). A ferramenta baixa: o novo `.lacre`, as 5 partes novas dos Guardiões (mesmo formato de arquivo da Inauguração) e um `renovacao-resultado-*.json` — só a chave pública nova e os totais do novo lacre, nunca material secreto.
- `POST /api/cripta/renewal` — a segunda metade da cerimônia, online: recebe o `renovacao-resultado-*.json` (a Administração associa cada apelido usado offline à conta real de um Irmão Ativo no Portal), valida os 5 novos Guardiões (Ativos, vinculados, distintos, nenhum o Venerável), recusa se o recebimento estiver aberto ou sem Comissão nomeada, e então: atualiza `criptaCryptoV1` (nova chave pública, novo quadro de Guardiões, `guardianShares` reiniciado — `inauguratedAt`/`masterId` originais preservados, a Inauguração continua ato único histórico; `lastRenewedAt`/`renewalCount` novos), substitui `criptaSealsV1` por um recibo fresco apontando para o novo `.lacre` com `export.receiptCode` já preenchido (o arquivo já existe, vindo da ferramenta offline — não há o que exportar online; o fluxo cai direto em Conferência física), e grava `renovacao.concluida`/`renovacao.sealed` nos mesmos logs append-only já usados pelas outras cerimônias.
- `RenewalPanel` em `/cripta-administracao` (sempre visível exceto durante o recebimento aberto) conduz essa segunda metade — upload do resultado, associação de apelidos a contas reais, confirmação.
- Depois de registrado, o ciclo normal (Conferência física → Limpeza do Wix → Restauração → Reabertura) se aplica sem nenhuma mudança — reaproveita tudo o que já existia.

**Decidido institucionalmente e implementado (2026-10-03):**

- **Import de lista pré-exportada na ferramenta offline** (reduz erro de digitação, continua 100% offline): `GET /api/cripta/eligible-members` — rota online, só leitura, devolve `{id, nome}` dos Irmãos Ativos com conta vinculada (mesma elegibilidade do sorteio), nada secreto. `RenewalPanel` ganhou o botão de baixar esse arquivo, para levar ao ambiente offline antes de começar. Lá, `parseEligibleMembers` (novo, testado) lê o arquivo e `template.html` passa a oferecer um `<select>` com os nomes (mais "Outro" para digitar, se o Irmão não estiver na lista) em vez de só um campo de texto livre — a associação à conta real continua acontecendo depois, online, como já era.
- **Notificação proativa no nível crítico**: quando `PATCH /api/cripta/guardian-shares` recalcula o alerta e ele chega a `critico`, a rota dispara `notifyAllActiveUsers` (mecanismo já existente da Central de Avisos do Portal) para todo usuário com permissão `tenant:manage`, com `tipo: 'system'` e link direto para `/cripta-administracao` — deduplicado por `validCount`, então um novo aviso só sai se a situação piorar ainda mais enquanto crítico, não a cada checagem. Não bloqueia nenhuma ação do sistema (decisão institucional: só avisar, não travar).
