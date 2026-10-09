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

## Demonstrações com conteúdo fictício

A tela Conhecimento e sua alternativa Biblioteca abrem demonstrações interativas. O botão Conhecer a Cripta abre uma demonstração com carta fictícia. As três áreas reutilizam o padrão visual e as ações existentes no código, com conteúdo ilustrativo identificado. Estado, carrinho, solicitações, avaliações e progresso ficam apenas em memória e voltam ao cenário inicial ao recarregar a apresentação. Nenhuma chamada é feita às APIs ou aos serviços do Portal. O download de exemplo gera um arquivo de texto local.

Biblioteca: seis obras hipotéticas, formatos físico/digital/ambos, disponibilidade, rankings, detalhes, sinopse, parecer, leitura, download, avaliação, carrinho, seleção de sessão e histórico. Conhecimento: formações, jornada, aulas de texto, avaliação, progresso e referência à Biblioteca. Cripta: destinatário, apelido, título, mensagem, rascunho e revisão. A demonstração da Cripta não simula criptografia nem guarda definitiva.

Referências de implementação: catálogo e detalhes em `app/(member)/acervo/biblioteca`, carrinho e avaliações em `modules/library/components`, formação e progresso em `modules/knowledge/components/knowledge-member.tsx`, escrita e revisão em `app/(member)/cripta/cripta-experience.tsx`.

## Brasão da Grande Loja

A abertura e o encerramento usam o brasão fornecido em `logooficial2.jpg`, com fundo externo transparente. A faixa branca permanece visível. O arquivo é exibido inteiro com `object-fit: contain`, sem opacidade, filtros ou recorte CSS. Seu espaço de 136 × 136 mantém altura visual próxima dos brasões da Loja e da Gestão.

## Distribuição dos logotipos

O logotipo do Portal VL6 aparece somente no cabeçalho de cada slide. Na abertura e no encerramento, a faixa institucional inferior apresenta uma única vez os brasões da Loja, da Gestão e da Grande Loja, preservando proporções e legibilidade. As demonstrações mantêm o logotipo do Portal apenas em seu próprio cabeçalho.
