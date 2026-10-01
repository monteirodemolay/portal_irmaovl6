# Cripta — revisão para preparação da liberação (29/09/2026)

**Estado: correções preparadas para revisão; recebimento institucional de cartas reais ainda não liberado.**

Esta revisão parte do commit `2cbc09c` da branch `claude/portal-irmao-vl6-co6uvq`. Não equivale a publicação em produção nem a um ensaio autenticado no Wix/Firestore. O acesso continua restrito à conta piloto. Este registro prevalece sobre descrições históricas conflitantes da especificação e do manual, no escopo das alterações abaixo.

## Regras consolidadas nesta revisão

- Cinco Guardiões, com três partes necessárias para a abertura. API e tela de inauguração passam a exigir a mesma configuração. Chaves existentes não são substituídas.
- Três cópias completas: A, B e C. A conferência passa a exigir as três, com manifestos distintos e iguais conteúdo, código e inventário. Registros anteriores de duas cópias permanecem históricos e não atestam a terceira.
- Cartas novas são seladas no navegador. Não podem ser relidas ou editadas pelo autor no Portal; uma alteração exige outra carta. Limite atual: cinco cartas por titular, com conferência transacional.
- Rascunhos continuam editáveis e usam chaves por conta mantidas no servidor. Administradores da infraestrutura podem tecnicamente acessar esse material; não se promete a confidencialidade criptográfica das cartas seladas para rascunhos.
- Durante a geração da chave, o navegador manipula a chave privada inteira e as partes em memória. A fragmentação não prova que um computador comprometido ou um operador não tenha feito cópia. A cerimônia exige computador controlado e entrega individual dos arquivos. Não há rotação/revogação criptográfica de guardiões implementada nesta revisão.
- O recebimento exige um registro explícito com início e término válidos. Ausência, datas inválidas, prazo vencido e configuração antiga sem prazo resultam em bloqueio. A abertura permite 1 a 30 dias, com padrão de 10 dias corridos a partir do ato; as datas são gravadas como instantes UTC. A próxima data institucional é distinta do prazo para escrever.
- A abertura inicial pode ocorrer sem recibo anterior somente se não existe lacração e o inventário está vazio, após a inauguração. Reaberturas preservam a conferência do recibo e do inventário. A data programada não abre a Cripta automaticamente.
- Anexos novos: até 2,3 MB por carta; JSON anterior à cifra: até 3,2 MB; requisição cifrada: até 4,4 MB. A redução considera a codificação base64 dos anexos e a segunda codificação após cifrar. Conteúdo legado não é apagado ou convertido por essa mudança. Um rascunho antigo acima da nova cota precisará ter seus anexos ajustados para uma nova gravação.

## Correções e evidências

| Risco observado                                                          | Correção                                                                                                                                   | Evidência local / limite                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Ausência de configuração abria o recebimento por padrão                  | Política que bloqueia por padrão e exige prazo; reconferência na transação de carta/rascunho/exclusão                                      | Testes do intervalo e API com fechamento durante upload                                                                                  |
| Repetição do envio criava novos IDs                                      | ID derivado de loja, titular e envelope exato; reapresentação do recibo; cliente conserva envelope para repetir na mesma tela              | Duas tentativas concorrentes simuladas produzem um registro; atualizar a página não conserva o envelope pendente                         |
| Cota conferida fora da transação                                         | Consulta e serialização por titular dentro da transação                                                                                    | Teste com cota atingida; sem ensaio de concorrência no Firestore real                                                                    |
| Envelope malformado ou chave privada incidental                          | Validação estrita do formato, base64url, nonce e ponto P-256; rejeição de campos extras; chave pública da cerimônia conferida na transação | Testes de valores inválidos, chave errada e limite de transporte; servidor não consegue provar que o conteúdo cifrado é uma carta válida |
| Remoção de rascunho antigo atingia edição mais recente                   | DELETE exige revisão; desvinculação transacional; tombstone conserva revisão; arquivos pendentes ficam em fila de limpeza                  | Código revisado; ensaio em dois aparelhos ainda pendente                                                                                 |
| Exclusão de carta concorria com o fechamento                             | Estado reconferido na transação; tombstone e fila de limpeza antes de chamar Wix                                                           | Código revisado; comportamento real de falha do provedor ainda pendente                                                                  |
| Resposta ambígua do Firestore podia levar à remoção de upload confirmado | Reconferir referência antes de limpar; se a conferência falhar, preservar o objeto                                                         | Código revisado; reconciliação operacional ainda necessária                                                                              |
| Remoção do Wix sem recuperação das chaves antigas/rascunhos              | Endpoint de limpeza geral bloqueado; tela explica o motivo                                                                                 | Nenhuma chamada de remoção geral é executada por esse endpoint                                                                           |
| Reserva C não participava da conferência                                 | Tela, comparação e API exigem A/B/C                                                                                                        | Teste rejeita C divergente, repetida ou ausente                                                                                          |
| Ferramenta offline versionada divergente do build                        | Build usa caminhos estáveis para dependências e bundle foi regenerado                                                                      | Teste compara o HTML versionado com nova compilação                                                                                      |

Ensaio criptográfico local: carta fictícia com bytes representativos de foto, áudio e vídeo → selagem → arquivo CRIPTA/2 → três cópias em memória → leitura → reconstrução em todas as dez combinações de três dos cinco Guardiões → recuperação idêntica. Não testa reprodução de mídias reais, hardware USB ou custódia física. Duas partes não recuperaram a carta do ensaio.

## Pendências que impedem anunciar a liberação institucional

1. Rodar ensaio autenticado com dados fictícios no ambiente de homologação: rascunho entre aparelhos, anexo no limite, falha de upload, recibo, usuário sem autorização e acesso entre titulares/lojas.
2. Validar a recuperação integral de rascunhos e cartas legadas, inclusive dependências de chaves mantidas no Firestore. O arquivo cifrado exportado sozinho não basta. **Manter os objetos no Wix.**
3. Realizar a cerimônia de teste com arquivos de Guardiões efetivamente gravados, abrir a ferramenta offline em outro computador desconectado e recuperar anexos reproduzíveis. Nunca enviar partes privadas ao Portal, a logs ou ao relatório.
4. Gravar e reler três unidades independentes; registrar responsáveis, local de guarda, data, código, hashes, resultado e reposição de uma unidade. Três discos virtuais no mesmo computador servem apenas para ensaio.
5. Validar entrega individual, sucessão de guardiões e restrição de acesso na abertura excepcional. A chave única permite tecnicamente abrir outras cartas disponíveis ao quórum; a seleção na interface não constitui isolamento criptográfico por destinatário.
6. Resolver a reconciliação da fila `criptaCleanupPendingV1` e uploads órfãos sem apagar objetos ainda referenciados. Rascunhos retirados ficam nessa fila; não declarar eliminação física imediata de todas as cópias.
7. Confirmar testes e deploy da revisão; registrar resultado do build completo e ensaio visual em celular/computador. Só depois preparar alteração explícita do acesso piloto. Esta revisão não altera essa restrição.

## Aplicação ao piloto existente

Após publicar estas correções, uma configuração antiga `{ open: true }` sem prazo passará a aparecer fechada. Inventarie os dados, registre a lacração com a ata e faça uma reabertura documentada com prazo; não altere diretamente a base para contornar a verificação. Se já existe lacre vigente, confira seu recibo. A API permite lacrar uma janela vencida ou ausente, desde que as demais exigências de comissão/ata/inventário sejam atendidas.

Nenhuma chave, carta, comissão ou arquivo de produção foi modificado durante os testes desta revisão. As alterações de código não substituem a operação presencial dos responsáveis.

## Verificação da revisão

- 51 testes passaram em 17 arquivos da Cripta (`vitest run src/modules/cripta`). Inclui testes existentes e novos; os testes de API usam serviços simulados.
- TypeScript do aplicativo passou em execução limpa (`tsc --noEmit --incremental false -p apps/web/tsconfig.json`).
- ESLint passou nos arquivos TypeScript/React alterados; `git diff --check` sem erros.
- Não executados: build de produção completo, navegação autenticada, teste visual de aparelhos reais, restauração de base Firestore, chamadas reais de upload/exclusão no Wix e gravação física das unidades.

## Atualização de 01/10/2026

Foi adicionada uma zerada administrativa, retomável, para repetir os percursos
de ensaio. Consulte [o procedimento e seus limites](cripta-zerada-ensaios.md).
A zerada não remove os bloqueios da liberação definitiva nem da limpeza anual.
