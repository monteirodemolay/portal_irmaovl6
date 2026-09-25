# Cripta VL6 — implantação real e critérios de abertura

Estado em 25/09/2026: **bloqueada para dados reais**. O ensaio Wix utiliza somente 1 KiB aleatório. O ensaio integrado Wix + Firestore concluiu o ciclo com retorno HTTP 200 em produção, inclusive leitura, conferência e solicitação de limpeza. Isso não ensaia mídias reais, recuperação de chaves nem três cópias offline. A flag `CRIPTA_REAL_CONTENT_ENABLED` deve permanecer ausente até a aprovação de todos os critérios abaixo. O mero login do operador não libera conteúdo.

Ligação técnica em elaboração: `POST /api/cripta/capsules` aceita somente pacote JSON já cifrado de até 1,5 MB, reserva vaga no inventário Firestore do próprio titular, envia bytes ao Wix como arquivo privado e grava hash SHA-256. `GET /api/cripta/capsules/[id]` confere o hash ao baixar e só responde durante janela habilitada. O ensaio `POST /api/cripta/integration-check` usa 1 KB aleatório, percorre Wix e Firestore e solicita exclusão. Ainda não foram implementadas cerimônia de duas aprovações para criar/abrir a janela, exclusão real de cápsulas, mídias grandes, exportação para unidades externas e partilha de recuperação. Não definir a flag como `true` manualmente.

## Fluxo pessoal aprovado para construção

Uma carta, seu destinatário e até dez fotos, dois áudios e um vídeo formam **um pacote lógico**. Nenhum anexo é obrigatório. A página pessoal deve apresentar apenas: (1) minhas cartas, (2) escrever e anexar, (3) conferir o pacote. Após depósito confirmado, a carta permanece inalterada por padrão. Alterar é uma ação voluntária e explícita do titular durante janela autorizada: construir uma **nova versão completa**, verificar a leitura dessa versão e então marcar a antiga para retirada. Nunca sobrescrever o único objeto no Wix nem apagar a versão anterior antes da confirmação. O índice externo não contém nomes, destinatários nem o teor.

O novo formulário da página é apenas uma **prévia na memória da aba**. Fechar a aba apaga cartas e arquivos; o botão de revisão não envia conteúdo. Não exibir a palavra “guardado” como confirmação de custódia nessa etapa. O servidor existente guarda somente JSON cifrado pequeno sem anexos, de modo que não é válido ligá-lo ao botão do novo formulário. A tela operacional só poderá trocar “prévia” por “depositar” depois de testar todos os passos de cifra, depósito, restauração e exportação para três unidades externas.

Para a operação anual, o fechamento precisa primeiro impedir novas alterações; depois exportar inventário e **todos** os objetos cifrados, verificar SHA-256 e autenticação de amostras, restaurar cada uma das três mídias em outro equipamento e obter recibos assinados. Somente após isso solicitar a remoção dos objetos Wix. Uma resposta de API à solicitação de exclusão não prova eliminação de backups ou caches do provedor. Se a exportação falhar, manter a cópia cifrada temporária isolada e registrar a exceção; não declarar a cripta fechada com custódia íntegra.

O módulo `sealed-capsule.ts` implementa um primeiro envelope portátil de cartas pequenas com Web Crypto, AES-256-GCM e PBKDF2. O ensaio local comprovou ida e volta e rejeição de alteração do ciphertext. Ele ainda **não** possui custódia de chave, destinatários com chaves públicas, anexos nem conexão ao armazenamento. Frases de baixa entropia podem ser atacadas offline se o pacote cifrado vazar; a escolha final deve passar por revisão externa antes de receber cartas reais.

## Decisões de segurança

Decisão do proponente em 25/09/2026: **recuperação por custódia conjunta**. Desenho proposto para validação: três guardiões independentes, com exigência de dois para reconstruir a chave de recuperação em cerimônia presencial, mediante decisão registrada; nenhuma parcela no e-mail, Firestore, Wix ou repositório. Os guardiões poderão, juntos, tecnicamente ler o conteúdo. O mecanismo de partilha, rotação após troca de guardião e ferramenta de reconstrução precisam de seleção auditada e teste de perda/comprometimento antes de gerar a primeira chave real. Este documento não atribui identidades aos guardiões nem cria chaves reais.

1. A unidade é uma cápsula por destinatário: carta, até dez fotografias, áudio e vídeo dentro de cotas verificadas no navegador **e no servidor**. A identidade do destinatário fica dentro da cápsula cifrada; o índice externo contém apenas IDs opacos e tamanho aproximado.
2. O navegador cifra cada cápsula com chave aleatória AES-256-GCM e um nonce novo. O servidor e o Wix recebem somente ciphertext autenticado. A chave de conteúdo é embrulhada para o titular e, se eleito, para o destinatário usando chaves públicas verificadas; o operador não deve receber chave privada. A escolha dos formatos e bibliotecas precisa de revisão criptográfica independente e interoperabilidade testada antes da implantação.
3. Recuperação por e-mail ou biometria **não recupera magicamente a chave**. Qualquer recuperação institucional capaz de decifrar exige custódia aprovada e separação de poderes, com transparência sobre quem poderá ler. Escolher entre perda irrecuperável e custódia antes do primeiro depósito. Documentar cópias de recuperação fora do portal e ensaiar a restauração.
4. Firestore mantém apenas controle de janelas, índice opaco, versão e recibos de integridade. Wix Media Manager guarda pacotes cifrados privados durante a janela autorizada; **três unidades externas independentes** recebem o acervo cifrado completo: A e B sob custódias em locais separados, C como reserva da Loja. Cada uma pode ser SSD externo ou pen drive, desde que tenha capacidade suficiente, seja cifrada, identificada no inventário e aprovada em leitura integral e restauração. Evitar dispositivos do mesmo lote ou sob a mesma guarda. A reserva é verificada periodicamente, mas permanece desconectada fora das verificações. Sem confirmação das três cópias restauráveis, a janela não pode ser encerrada como concluída.
   Em caso de extravio ou falha, o administrador registra ocorrência e um segundo responsável acompanha a reposição de uma unidade nova a partir de uma cópia integralmente verificada. A ferramenta local `scripts/cripta/replace_copy.py` copia somente pacotes cifrados para destino vazio e confere o resultado; ela não equivale a uma função já disponível na interface do Portal. A ocorrência e o identificador da mídia perdida permanecem no histórico. A capacidade de registrar e aprovar isso no site ainda precisa ser implementada.
5. Arquivo superior a 4,5 MB deve ir do navegador diretamente à URL temporária de upload do Wix após a cifragem. Nenhuma credencial Wix vai ao navegador. Uma API autenticada emite URL curta vinculada ao usuário e ao tipo/tamanho autorizados; outra API confere o `fileId`, privacidade, tamanho e hash antes de incluir o objeto no inventário. Confirmar suporte a CORS e semântica real das URLs num ensaio de ponta a ponta.
6. Abertura anual exige registro de deliberação, intervalo com fuso definido, operadores habilitados e confirmação do estado das três unidades externas. A janela autoriza cada irmão a modificar apenas as próprias cápsulas; expiração fecha no servidor independentemente da interface. Adiamento mantém a cripta fechada até nova deliberação. Exceções de óbito/quite-placet geram autorização individual, nunca abertura geral.
7. Exclusão pelo titular revoga acesso e inicia limpeza de todas as cópias, com recibos por mídia. Quite-placet é procedimento administrativo com devolução cifrada opcional e comprovante; retenção e prazo precisam ser definidos. Não afirmar apagamento físico irrecuperável de SSD, pen drive, snapshots e backups sem verificação específica. Para minimizar remanescência, chave exclusiva por cápsula permite destruição criptográfica, desde que não existam cópias da chave.
8. Entrega após óbito requer documento, verificação de destinatário, aprovação por duas pessoas e trilha de custódia. Só os pacotes autorizados entram no pendrive. A família decifra no próprio dispositivo e produz PDF local; áudio e vídeo seguem como arquivos separados. A Loja não deve prometer que jamais poderá ler caso escolha mecanismo de recuperação sob seu controle.

## Ensaios obrigatórios antes da flag

| Ensaio | Aceitação |
| --- | --- |
| Chave Wix e permissões | Upload real privado, download autenticado e exclusão verificada sem URL pública. |
| Carta e anexos | Cifrar antes do envio, reabrir no dispositivo do titular, rejeitar adulteração de um byte. |
| Acesso | Outro usuário, janela fechada, conta inativa e URL antiga não obtêm conteúdo; testar no servidor. |
| Limites | Dez fotos por carta, cinco cartas, vídeo até 60 s/60 MB, dois áudios até 3 min/10 MB cada, total de 150 MB por irmão; testar concorrência e tamanho após cifragem. |
| Resiliência | Interromper upload, perder conexão, repetir requisição, faltar espaço e restaurar **cada uma** das três unidades externas em computador diferente. |
| Recuperação | Simular perda de chave, troca de operador, falha de uma unidade externa, indisponibilidade Wix e adiamento da janela. |
| Desligamento | Exportar inventário cifrado, comparar SHA-256, restaurar amostras sob autorização, retirar objetos temporários Wix, verificar exclusão. |
| Entrega excepcional | Validar autorização dupla e destinatário; testar que pacote de outro irmão não é entregue. |

## Ordem de implementação

1. Definir e revisar formalmente custódia de chaves, identidade dos destinatários e política de retenção.
2. Construir cifra no navegador e formato versionado de pacote; provar restauração offline em outro dispositivo.
3. Conectar uploads privados Wix com confirmação posterior e banco de metadados transacional; impor cotas e isolamento no servidor.
4. Implementar administração de janelas e autorizações excepcionais com auditoria; adicionar experiência pessoal persistente.
5. Construir exportação para três unidades externas, restauração, exclusão e entrega familiar; realizar todos os ensaios acima com dados artificiais e revisão externa.
6. Só então ativar `CRIPTA_REAL_CONTENT_ENABLED=true` para a conta piloto; expansão a outros irmãos requer deliberação própria.

Não usar o código do ensaio de 1 KiB como cifra do conteúdo real: naquele fluxo a chave é descartada após o upload, de modo que o pacote é intencionalmente irrecuperável.
