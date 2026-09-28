# Cripta VL6 — roteiro de designação, lacração e abertura em sessão

## Regra de responsabilidade

O primeiro responsável é sempre **o ocupante do cargo de Venerável Mestre na gestão vigente do Portal**. Não se escolhe livremente esse nome na Cripta. A designação registra quem ocupava o cargo naquele dia, mas a próxima abertura resolve o cargo de novo. Se o titular falecer, renunciar ou perder o cargo, a Loja deve atualizar a gestão e a conta do sucessor antes do ato.

Em sessão, indicar separadamente um segundo responsável para o **fechamento** e um para a **próxima abertura**. Eles podem ser a mesma pessoa. É possível registrar até dois substitutos ordenados, ativos e com conta vinculada. Registrar a ata e o motivo. Toda substituição gera novo evento com o estado anterior e o novo; não apaga o histórico. O substituto só atua se indicado e com motivo registrado no ato.

Os nomes registrados no sistema descrevem a deliberação da Loja. Neste piloto, o Portal ainda identifica apenas **a conta administrativa que realizou a operação**: registrar dois nomes não equivale a colher duas assinaturas digitais independentes ou a dividir tecnicamente uma chave.

## Fechamento e recibo

1. Confirmar a designação, o Venerável vigente, o segundo responsável e os substitutos. Registrar a ata.
2. Encerrar o recebimento. A API passa a rejeitar novos depósitos e edições iniciados após o fechamento. Uma transferência em curso precisa revalidar o estado antes de registrar a carta ou o rascunho.
3. Conferir os envios pendentes e o inventário. O recibo computa um SHA-256 sobre referências ordenadas dos objetos cifrados registrados: tipo, identificador, titular, ID do arquivo Wix e hash dos bytes cifrados. Inclui cartas concluídas e rascunhos.
4. Registrar a lacração com a ata. O recibo contém código `VL6-AAAAMMDD-XXXXXXXXXXXX` (data de São Paulo + parte aleatória), horário, contagens, hash do inventário, hash do próprio recibo, Venerável e segundo responsável, e código anterior. Baixar o JSON e transcrever código, hash e contagens na ata física. A cópia externa da ata é a referência independente para conferência posterior.
5. Copiar os arquivos para as duas unidades externas e **ler de volta cada unidade**, comparando os hashes. Registrar em ata quem guardou cada unidade, resultado e ocorrência. O recibo online sozinho não comprova essas cópias. Não apagar os arquivos temporários do Wix por causa apenas desse recibo.

## Próxima abertura

1. Trazer a ata e as unidades, identificar o Venerável da gestão então vigente e o segundo responsável designado (ou substituto com motivo).
2. Conferir o código e o hash no recibo guardado fora do Portal. Se uma unidade foi perdida, restaurar de outra íntegra e conferir a reposição antes de prosseguir; registrar ocorrência.
3. Informar na tela o código do último lacre, a ata e o segundo responsável presente. A API compara o código e recalcula o hash e a contagem do inventário registrado. Divergência suspende a abertura para apuração; ela não é corrigida alterando manualmente o recibo.
4. Após a abertura, cartas podem ser atualizadas dentro da janela autorizada. No novo fechamento, emitir **outro** recibo, com novo código e referência ao anterior.

## Limites e resposta a incidentes

- O SHA-256 detecta mudança no inventário **quando comparado à cópia da ata mantida fora do mesmo sistema**. Sem esse confronto, um administrador da infraestrutura pode alterar tanto dados quanto recibos. O código aleatório identifica o ato; sozinho não é uma assinatura nem uma chave de criptografia.
- A conferência atual é do **inventário de metadados**. A leitura do conteúdo cifrado no Wix e de cada unidade externa é uma verificação separada. Um hash do inventário igual não prova que o provedor não perdeu bytes nem que duas mídias físicas estão íntegras.
- Na ausência, morte ou troca do Venerável, atualizar a gestão vigente; na falta do segundo responsável, registrar em ata o substituto previamente indicado e o motivo. Se nenhum estiver disponível, deliberar e atualizar a designação antes de abrir. A perda da chave da conta ou do inventário não é solucionada pelo código do lacre.
- Se a data agendada for perdida, manter o recebimento fechado até nova sessão e registrar a nova ata. Não abrir automaticamente só porque chegou a data.
- Antes de ampliar o acesso aos demais irmãos, ensaiar com cartas de teste o ciclo completo, inclusive duas mídias e recuperação de chaves, e implementar aprovações digitais distintas caso a Loja queira que a dupla presença seja exigida tecnicamente.
