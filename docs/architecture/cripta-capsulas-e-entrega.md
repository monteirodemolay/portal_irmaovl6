# Cripta: cápsulas, destinatários e entrega

Estado: proposta para ensaio. Nenhum conteúdo real deve ser recebido pelo protótipo atual.

## Unidade de conteúdo

Uma cápsula contém uma carta escrita no Portal, seu destinatário designado e até dez fotos. Áudio e vídeo podem acompanhar a cápsula dentro dos limites globais. O vínculo a um destinatário pertence à cápsula, e os anexos seguem a mesma regra. Se o titular quiser enviar mensagens diferentes a pessoas diferentes, cria cápsulas separadas. O inventário deve distinguir o identificador interno do titular, o identificador da cápsula e os identificadores de cada anexo; textos e nomes sensíveis não devem aparecer em caminhos ou logs.

## Separação de poderes

O irmão cria, altera e apaga as próprias cápsulas somente durante a janela autorizada. A exclusão completa é uma ação própria do titular, com confirmação forte, e só pode ser declarada concluída quando as cópias online, as versões de backup e as mídias físicas tiverem sido tratadas segundo a política de retenção. Quite-placet é ato da administração: bloqueia alterações e inicia devolução ou descarte individual auditável; não é pedido nem botão de quite dentro da Cripta pessoal.

## Falecimento e destinatários

1. Verificar o óbito por documentação idônea e conferir a identidade do requerente, a destinação registrada pelo irmão e eventuais impedimentos. Parentesco isolado não autoriza a leitura de todas as cápsulas.
2. Registrar a deliberação interna com duas pessoas responsáveis, delimitando quais cápsulas serão entregues a cada destinatário. Registrar decisões e integridade dos pacotes, nunca o teor das cartas.
3. Preparar um pendrive novo com apenas os pacotes cifrados destinados à pessoa aprovada; validar sua integridade sem decriptar. Manter comprovante de entrega e canal separado para a chave.
4. O destinatário abre em dispositivo sob seu controle e então visualiza ou gera PDF da carta e das fotos; áudios e vídeos devem acompanhar o PDF como arquivos separados, porque o PDF não preserva com confiabilidade a experiência multimídia.

## Restrição criptográfica decisiva

Para a Loja transportar sem ler, a chave de decriptação de cada cápsula precisa estar disponível ao destinatário sem estar disponível à Loja, por exemplo por chave pública cadastrada e verificada previamente, com chave privada sob controle do destinatário. Isso exige prever perda da chave, mudança de destinatário e pessoas sem conta. Se a instituição guardar uma forma de recuperação capaz de reconstruir sozinha a chave, pessoas com esse poder também poderão ler o conteúdo. Uma política de custódia com múltiplas pessoas reduz risco e deixa rastros, mas não permite afirmar impossibilidade criptográfica de leitura pelos custodiante(s). O fluxo de recuperação só poderá ser escolhido depois dessa decisão institucional.

O PDF não deve ser produzido no servidor em texto claro se a Loja promete não ler as cartas. O protótipo atual não cifra nem grava conteúdos pessoais: apenas simula no navegador o vínculo entre carta, destinatário e mídia.
