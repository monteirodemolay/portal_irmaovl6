# Cripta VL6 — implantação real e critérios de abertura

Estado em 25/09/2026: **bloqueada para dados reais**. O ensaio Wix utiliza somente 1 KiB aleatório. A flag `CRIPTA_REAL_CONTENT_ENABLED` deve permanecer ausente até a aprovação de todos os critérios abaixo. O mero login do operador não libera conteúdo.

O módulo `sealed-capsule.ts` implementa um primeiro envelope portátil de cartas pequenas com Web Crypto, AES-256-GCM e PBKDF2. O ensaio local comprovou ida e volta e rejeição de alteração do ciphertext. Ele ainda **não** possui custódia de chave, destinatários com chaves públicas, anexos nem conexão ao armazenamento. Frases de baixa entropia podem ser atacadas offline se o pacote cifrado vazar; a escolha final deve passar por revisão externa antes de receber cartas reais.

## Decisões de segurança

Decisão do proponente em 25/09/2026: **recuperação por custódia conjunta**. Desenho proposto para validação: três guardiões independentes, com exigência de dois para reconstruir a chave de recuperação em cerimônia presencial, mediante decisão registrada; nenhuma parcela no e-mail, Firestore, Wix ou repositório. Os guardiões poderão, juntos, tecnicamente ler o conteúdo. O mecanismo de partilha, rotação após troca de guardião e ferramenta de reconstrução precisam de seleção auditada e teste de perda/comprometimento antes de gerar a primeira chave real. Este documento não atribui identidades aos guardiões nem cria chaves reais.

1. A unidade é uma cápsula por destinatário: carta, até dez fotografias, áudio e vídeo dentro de cotas verificadas no navegador **e no servidor**. A identidade do destinatário fica dentro da cápsula cifrada; o índice externo contém apenas IDs opacos e tamanho aproximado.
2. O navegador cifra cada cápsula com chave aleatória AES-256-GCM e um nonce novo. O servidor e o Wix recebem somente ciphertext autenticado. A chave de conteúdo é embrulhada para o titular e, se eleito, para o destinatário usando chaves públicas verificadas; o operador não deve receber chave privada. A escolha dos formatos e bibliotecas precisa de revisão criptográfica independente e interoperabilidade testada antes da implantação.
3. Recuperação por e-mail ou biometria **não recupera magicamente a chave**. Qualquer recuperação institucional capaz de decifrar exige custódia aprovada e separação de poderes, com transparência sobre quem poderá ler. Escolher entre perda irrecuperável e custódia antes do primeiro depósito. Documentar cópias de recuperação fora do portal e ensaiar a restauração.
4. Firestore mantém apenas controle de janelas, índice opaco, versão e recibos de integridade. Wix Media Manager guarda pacotes cifrados privados durante a janela autorizada; dois SSDs independentes, cifrados e mantidos em locais separados recebem o arquivo final. Sem confirmação de duas cópias restauráveis, a janela não pode ser encerrada como concluída.
5. Arquivo superior a 4,5 MB deve ir do navegador diretamente à URL temporária de upload do Wix após a cifragem. Nenhuma credencial Wix vai ao navegador. Uma API autenticada emite URL curta vinculada ao usuário e ao tipo/tamanho autorizados; outra API confere o `fileId`, privacidade, tamanho e hash antes de incluir o objeto no inventário. Confirmar suporte a CORS e semântica real das URLs num ensaio de ponta a ponta.
6. Abertura anual exige registro de deliberação, intervalo com fuso definido, operadores habilitados e confirmação do estado dos SSDs. A janela autoriza cada irmão a modificar apenas as próprias cápsulas; expiração fecha no servidor independentemente da interface. Adiamento mantém a cripta fechada até nova deliberação. Exceções de óbito/quite-placet geram autorização individual, nunca abertura geral.
7. Exclusão pelo titular revoga acesso e inicia limpeza de todas as cópias, com recibos por mídia. Quite-placet é procedimento administrativo com devolução cifrada opcional e comprovante; retenção e prazo precisam ser definidos. Não afirmar apagamento físico irrecuperável de SSD, snapshots e backups sem verificação específica. Para minimizar remanescência, chave exclusiva por cápsula permite destruição criptográfica, desde que não existam cópias da chave.
8. Entrega após óbito requer documento, verificação de destinatário, aprovação por duas pessoas e trilha de custódia. Só os pacotes autorizados entram no pendrive. A família decifra no próprio dispositivo e produz PDF local; áudio e vídeo seguem como arquivos separados. A Loja não deve prometer que jamais poderá ler caso escolha mecanismo de recuperação sob seu controle.

## Ensaios obrigatórios antes da flag

| Ensaio | Aceitação |
| --- | --- |
| Chave Wix e permissões | Upload real privado, download autenticado e exclusão verificada sem URL pública. |
| Carta e anexos | Cifrar antes do envio, reabrir no dispositivo do titular, rejeitar adulteração de um byte. |
| Acesso | Outro usuário, janela fechada, conta inativa e URL antiga não obtêm conteúdo; testar no servidor. |
| Limites | Dez fotos por carta, cinco cartas, vídeo até 60 s/60 MB, dois áudios até 3 min/10 MB cada, total de 150 MB por irmão; testar concorrência e tamanho após cifragem. |
| Resiliência | Interromper upload, perder conexão, repetir requisição, faltar espaço e restaurar os dois SSDs em computador diferente. |
| Recuperação | Simular perda de chave, troca de operador, falha de um SSD, indisponibilidade Wix e adiamento da janela. |
| Desligamento | Exportar inventário cifrado, comparar SHA-256, restaurar amostras sob autorização, retirar objetos temporários Wix, verificar exclusão. |
| Entrega excepcional | Validar autorização dupla e destinatário; testar que pacote de outro irmão não é entregue. |

## Ordem de implementação

1. Definir e revisar formalmente custódia de chaves, identidade dos destinatários e política de retenção.
2. Construir cifra no navegador e formato versionado de pacote; provar restauração offline em outro dispositivo.
3. Conectar uploads privados Wix com confirmação posterior e banco de metadados transacional; impor cotas e isolamento no servidor.
4. Implementar administração de janelas e autorizações excepcionais com auditoria; adicionar experiência pessoal persistente.
5. Construir exportação SSD, restauração, exclusão e entrega familiar; realizar todos os ensaios acima com dados artificiais e revisão externa.
6. Só então ativar `CRIPTA_REAL_CONTENT_ENABLED=true` para a conta piloto; expansão a outros irmãos requer deliberação própria.

Não usar o código do ensaio de 1 KiB como cifra do conteúdo real: naquele fluxo a chave é descartada após o upload, de modo que o pacote é intencionalmente irrecuperável.
