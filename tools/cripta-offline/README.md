# Ferramenta offline da Cripta (formato CRIPTA/2)

Esta é a ferramenta de lacração e verificação fornecida no pacote do projeto, com a divisão da chave corrigida para coeficientes aleatórios independentes. O arquivo `.lacre` gerado aqui **não é compatível com CRIPTA/1**. Nunca misture manifestos, envelope e arquivo de ciclos diferentes.

Rode `node tools/cripta-offline/teste-core.js` para conferir o núcleo criptográfico. Abra `ferramenta-cripta.html` localmente junto a `cripta-core.js` para os ensaios offline.

## Estado da integração

O Portal atual não é o site Wix Velo descrito no pacote. Ele usa Next.js, Firestore e mídia privada Wix. A ferramenta ainda espera o JSON de exportação definido em `wix/backend/http-functions.js` do pacote, que **não é emitido pelo Portal atual**. Portanto, esta pasta é código preparado para integração, não um caminho de lacração de cartas reais hoje. As telas do Portal não oferecem a exportação nem exclusão definitiva por esse mecanismo até existir uma integração testada.

O formato da impressão digital é SHA-256 da concatenação dos hashes de blocos de 64 MB com prefixo `CRIPTA-HASH|tamanho|`; não é o SHA-256 direto do arquivo. A comparação deve usar a própria ferramenta. Cada item tem SHA-256 direto e autenticação AES-GCM.

## Limite operacional ainda aberto

A ferramenta monta o pacote inteiro em memória do navegador e lê cada anexo integralmente. Para vídeos grandes e dezenas de irmãos, é necessária escrita em fluxo para a unidade escolhida e ensaio de recuperação de ponta a ponta antes de ativar o ciclo. Não use um botão de exclusão do Wix com base apenas no teste unitário da criptografia.
