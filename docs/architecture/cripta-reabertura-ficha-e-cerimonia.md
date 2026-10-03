# Cripta do Irmão — ficha da carta, cerimônias e nova Administração

**Estado:** especificação de destino registrada em 2026-10-03, implementação em andamento por fases (ver seção 7). Substitui, quando concluída, o modelo administrativo descrito em `cripta-especificacao-funcional.md` seção 5 e o wizard único de `cycle-wizard.ts`. Não apagar os documentos anteriores: eles continuam valendo como histórico até cada fase abaixo estar em produção e verificada.

## 0. Por que este documento existe

O modelo até aqui tratava a Cripta como um ciclo único (inaugurar → abrir → lacrar → exportar → restaurar → reabrir), operado por um wizard administrativo linear. Três necessidades novas não cabem nesse modelo sem reformular a base:

1. **Reaberturas são recorrentes e permanentes**, não um evento raro — a Loja recebe Irmãos novos continuamente, então "reabertura" é o estado normal de operação, não uma exceção.
2. **O Irmão precisa agir sobre cartas já seladas sem decifrá-las** — reter uma entrega, mudar o modo de entrega, sem prestar contas a ninguém. Isso exige um dado que hoje não existe: uma representação em claro da carta, separada do conteúdo cifrado.
3. **A cerimônia (inauguração, sorteio de Guardiões, aberturas e fechamentos) precisa de registro permanente, auditável**, para os anais da Loja — hoje nada disso é persistido, só o estado presente.

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

## 3. Log de cerimônia (`criptaCeremonyLogV1`)

Append-only, um documento por evento relevante — não um blob por cerimônia, para nunca perder um evento por sobrescrita concorrente.

```
criptaCeremonyLogV1/{tenantId}/events/{eventId}
  at: string (ISO)
  ceremony: 'inauguracao' | 'abertura' | 'fechamento' | 'reabertura'
  type: string   // 'presenca.registrada' | 'sorteio.resultado' | 'sorteio.redraw' | 'guardiao.compartilhamento_baixado' | 'lacracao.concluida' | ...
  operatorId: string
  payload: Record<string, unknown>  // metadados operacionais; nunca conteúdo de carta
```

- Escrita apenas via `POST /api/cripta/ceremony-log` (permissão `tenant:manage`), nunca update/delete pela API — correção é um novo evento, não uma edição do antigo.
- Alimenta duas coisas com a mesma fonte, sem duplicar dado: a tela do Projetor (leitura em tempo real, ver seção 4) e o relatório de anais (ver seção 5).
- Cobre exatamente os eventos do mock-up do Projetor: presença confirmada, cada resultado de sorteio (incluindo "sortear novamente" e o motivo informado pelo operador, se algum), download de compartilhamento por Guardião, abertura/fechamento/lacração.

## 4. Projetor — da maquete para dados reais

A maquete (`cripta-projetor-mockup.html`, versão 6) fixa o roteiro visual: 4 cerimônias (Inauguração — presença + sorteio com confirmar/sortear-de-novo; Abertura; Fechamento — incluindo a queima dos pen drives; Reabertura, clone estrutural da Abertura), o selo "Ato único" na Inauguração, e o aviso "Concluída — aguardando autorização" substituindo o botão morto "Próximo passo".

Implementação real:

- Nova rota `/cripta-projetor` (tela cheia, sem navegação do Portal — pensada para um projetor de sessão), que lê `criptaCeremonyLogV1` (via `onSnapshot`/polling) e `cycle-wizard`'s fase atual — zero dado mockado.
- Cada ação do operador na Administração (confirmar presença, sortear, confirmar Guardião, lacrar) grava um evento no log; o Projetor é um espectador puro do mesmo estado, nunca uma segunda fonte de verdade.
- O sorteio em si (ordem e resultado) é calculado no servidor (rota `/api/cripta/ceremony-draw`), não no navegador do operador, para o resultado não poder ser escolhido a dedo e para o "sortear de novo" também ficar no log com o resultado anterior preservado (nunca apagado, só superado).

## 5. Relatório para os anais

Gerado a partir do log, nunca mantido como segunda cópia:

`GET /api/cripta/ceremony-report?ceremony=inauguracao&at=...` — lê os eventos da cerimônia encerrada e monta um documento (HTML imprimível / PDF) com data, presentes, ordem e resultado do sorteio (com qualquer redraw e seu motivo), quem lacrou, código do recibo, hash do inventário. Não contém conteúdo de carta nem a ficha de nenhum Irmão (label/deliveryMode são dados do Irmão, não da cerimônia).

## 6. Nova Administração — substitui o wizard único

O wizard linear de `cycle-wizard.ts` tratava reabertura como um loop de volta à etapa 2. Isso deixa de fazer sentido quando reabertura é o estado permanente esperado. A tela nova é organizada por **cerimônia**, não por etapa única:

- `/cripta-administracao` — painel com 4 cartões (Inauguração, Abertura, Fechamento, Reabertura), cada um mostrando seu próprio estado (`nunca realizada` | `em andamento` | `concluída — aguardando autorização para a próxima`), substituindo o "Próximo passo" morto.
- Inauguração mostra o selo "Ato único" e fica desabilitada após ocorrer uma vez (`inaugurated: true` já existe em `cripta-crypto-state.ts`).
- Dentro de cada cartão, as ações hoje espalhadas por `inauguration-panel.tsx`, `comissao-form.tsx`, `seal-panel.tsx`, `export-panel.tsx`, `cleanup-panel.tsx`, `physical-unit-check.tsx`, `restore-panel.tsx` são realocadas para a cerimônia a que pertencem, sem ida-e-volta entre telas — o problema de UX relatado ("preciso ir pra frente e voltar") não se repete porque cada cerimônia é uma tela própria com todas as suas etapas internas visíveis de uma vez.
- `restore-panel.tsx` ganha uma seção adicional, só de leitura, mostrando quantas fichas de carta (não cartas) estão `retida` desde a última reabertura — para o operador saber que o pacote de entrega precisa respeitar essas retenções, sem ver quais.

### Migração do `cycle-wizard.ts`

`computeCycleStatus` deixa de representar reabertura como "fase 2 de novo" e passa a expor as 4 cerimônias como estados independentes (cada uma com seu próprio `nunca | em andamento | concluída`), mantendo como hoje a regra de que Inauguração só acontece uma vez. Os testes existentes (`online-opening-route.test.ts`, `restore-route.test.ts`) continuam validando as rotas por trás; o que muda é a composição da tela, não os contratos de API já corretos.

## 7. Fases de implementação

A substituição é executada em fases, cada uma validada (tsc + eslint + vitest, e revisão visual antes de produção) antes de remover a tela anterior — nunca uma substituição única e irreversível sobre um sistema em produção com custódia real de cartas:

1. **Ficha da carta** (seção 2): schema + API + tela do Irmão. Base de tudo abaixo.
2. **Log de cerimônia** (seção 3): schema + API de escrita, instrumentar as rotas existentes (`online-opening`, `seal`, `restore`) para gravar eventos.
3. **Projetor real** (seção 4): nova rota lendo o log; mock-up retirado da navegação só depois de validado lado a lado com uma cerimônia real.
4. **Relatório de anais** (seção 5).
5. **Nova Administração** (seção 6): só então os componentes antigos do wizard único são removidos — depois que as 4 telas por cerimônia estiverem no ar e testadas, nunca antes.

## 8. Impacto em `docs/legal`

A ficha da carta introduz dado pessoal novo: `label` (apelido escolhido pelo Irmão), `deliveryMode` e `status` de retenção. O log de cerimônia introduz retenção permanente de presença e resultado de sorteio por nome. Ambos exigem atualização de `01-inventario-dados-lgpd.md`, da Política de Privacidade e um novo registro em `04-sistema-de-versionamento.md`, feita junto com a Fase 1 e a Fase 2 de código, não depois. Avaliação preliminar: nenhuma das duas exige novo aceite dos usuários (a ficha amplia o controle do próprio Irmão sobre seu dado; o log de cerimônia é equivalente a ata de sessão, já esperada) — a confirmar explicitamente ao usuário quando essa atualização for feita.
