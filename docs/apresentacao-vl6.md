# Apresentação institucional do Portal VL6

A apresentação é servida como arquivo estático público em:

https://portal.vl6.com.br/apresentacao-vl6.html

Arquivo: `apps/web/public/apresentacao-vl6.html`.

A página contém 12 slides, 18 imagens estáticas, controles por clique e teclado, índice, ampliação de imagens, efeitos e roteiro do apresentador. Não consulta APIs, dados de usuários ou coleções do Portal. As capturas são imagens estáticas da apresentação aprovada. O arquivo é público e não requer sessão do Portal.

## Wix

No editor Wix, adicione **Incorporar código → Incorpore um site** e informe o endereço público acima. Defina o acesso da página como **Todos**. Para projeção, o endereço direto evita limitações de tamanho e tela cheia do iframe do Wix.

## Atualizações

Atualize o HTML e suas imagens mantendo o endereço público. Para publicação web, os logos, fundos e capturas ficam em `apps/web/public/apresentacao-vl6-assets/`. Publique sempre os arquivos de imagem junto com o HTML. O HTML original de distribuição contém essas imagens incorporadas. Publique o commit no ambiente que serve o domínio e confira o endereço sem cookies de sessão. Não adicione credenciais ou arquivos de configuração da aplicação ao HTML.

## Barra de controles

A barra se oculta após 3 segundos sem interação. Mova o mouse para a parte inferior, toque nessa região no celular ou pressione **C** para exibi-la. **C** ou o botão **Ocultar** escondem a barra. As setas do teclado continuam funcionando com a barra oculta. O slide aproveita toda a altura disponível e o rodapé institucional permanece no slide.
