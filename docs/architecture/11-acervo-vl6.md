# 11. Acervo VL6 — Memória, História e Conhecimento

## 11.1 Decisão arquitetural

O Acervo VL6 é a camada unificadora de pesquisa e descoberta do Portal do
Irmão. Ele não é um microsite e não substitui abruptamente as entidades que já
existem. A primeira versão agrega, sob `/acervo`, os conteúdos de Arquivos,
Biblioteca, Galeria e Favoritos, preservando suas rotas, casos de uso,
permissões e dados.

Princípios desta implantação:

1. a tela inicial `/dashboard` permanece intacta;
2. nenhuma coleção Firestore é migrada ou removida nesta etapa;
3. as rotas existentes continuam sendo os destinos canônicos dos itens;
4. `/acervo` oferece uma entrada única, pesquisa transversal e identidade
   editorial integrada ao `AppShell`;
5. toda evolução estrutural será feita de forma incremental, reversível e com
   migração testada.

## 11.2 Experiência integrada

O Acervo herda o shell, a autenticação, o tenant, o branding dinâmico, o modo
escuro, o RBAC, a responsividade e os padrões de acessibilidade do Portal. Sua
linguagem visual é mais editorial, mas utiliza apenas os tokens e componentes
do design system existente.

A navegação lateral apresenta uma única entrada `Acervo VL6`. Dentro da tela,
o Irmão encontra os quatro caminhos já funcionais:

- Documentos → `/arquivos`;
- Biblioteca → `/biblioteca`;
- Fotos e Vídeos → `/galeria`;
- Favoritos → `/downloads`.

As páginas legadas passam a utilizar o nome `Acervo VL6` em seu cabeçalho e
mantêm caminho de retorno para a central.

## 11.3 Pesquisa da primeira versão

A pesquisa de `/acervo` agrega, no servidor, somente dados que a sessão atual
tem permissão para consultar. Ela trabalha sobre:

- arquivos publicados;
- itens catalogados na Biblioteca;
- álbuns da Galeria.

Os resultados podem ser filtrados por tipo. A consulta é deliberadamente
limitada à camada já disponível no repositório; não existe indexador paralelo
nem dado duplicado nesta fase.

## 11.4 Direção editorial

O Acervo introduz uma identidade textual própria, sem atribuir frases novas a
autores ou tradições históricas. As frases aparecem identificadas como
`Manifesto do Acervo VL6`.

Frase de abertura:

> “Preservar a memória é manter acesa a Luz que orienta as gerações.”

O simbolismo maçônico é discreto: luz, construção, geometria, legado e
transmissão do conhecimento. Não se usam ornamentos excessivos nem elementos
que prejudiquem leitura, contraste ou acessibilidade.

## 11.5 Evolução de domínio

A unificação definitiva deverá ocorrer somente depois da catalogação e da
migração dos dados atuais. O modelo-alvo será composto por:

- `archiveItems`: descrição intelectual e contexto histórico;
- `mediaAssets`: originais, derivados, miniaturas, hash e dados técnicos;
- `archiveCollections`: coleções editoriais e institucionais;
- `archiveRelations`: relações com Irmãos, gestões, eventos, notícias e itens;
- `archiveTags`: vocabulário controlado e palavras-chave;
- `archiveAccessPolicies`: acesso institucional, administrativo, restrito ou
  embargado;
- `archiveContributions`: sugestões de identificação e complementação;
- `catalogingHistory`: histórico de revisão e publicação.

`members`, `boardTerms`, `events` e `news` não serão copiados para o Acervo.
Serão referenciados pelos seus IDs canônicos, evitando duplicidade e
divergência de informação.

## 11.6 Evolução para experiências especializadas (Estágio 1 — fundação e convergência; não confundir com a "Etapa 1" do roadmap abaixo)

A evolução do Acervo VL6 para um conjunto de experiências editoriais
especializadas (pesquisa, coleções, linha do tempo, pessoas, gestões,
eventos, exposições etc.) converge todas as rotas para uma única página
canônica: **Item do Acervo**, em `/acervo/item/[id]`.

Como a catalogação formal (`archiveItems`, ver §11.5) ainda não existe, o
`id` desta primeira etapa é um **ID composto de compatibilidade** —
`tipo_idDeOrigem` (`file_<fileId>`, `library_<libraryItemId>`,
`gallery-album_<albumId>`, `gallery-media_<mediaId>`) — resolvido
diretamente contra `FileAsset`, `LibraryItem`, `GalleryAlbum` e
`GalleryMedia`, sem duplicar nenhum registro
(`apps/web/src/modules/archive/lib/resolve-archive-item.ts`). Quando a
coleção `archiveItems` for criada, seu `id` próprio passa a ser o `id`
canônico e o ID composto atual fica guardado em `origemId` — nenhuma URL já
publicada deixa de funcionar. O separador é `_`, não `:` — QA no emulador
mostrou o navegador reescrevendo `:` para `%3A` em navegação direta (mas não
na interceptação client-side, que reaproveita a string literal do `href`),
quebrando o acesso duplo; `_` é caractere "unreserved" (RFC 3986) e nunca é
reescrito.

A página tem acesso duplo, seguindo o mesmo padrão de rota paralela e
interceptadora já usado em `admin/pessoas/irmaos`: navegação direta/refresh
renderiza a página cheia; ao navegar a partir de uma lista dentro de
`/acervo` (hoje, a pesquisa federada da própria central), a mesma rota é
interceptada (`@preview/(.)item/[id]`) e abre como painel lateral, sem
perder o contexto da lista.

Esta etapa também fecha um gap de segurança pré-existente identificado na
auditoria: `GalleryMedia` não tinha proxy autenticado — a URL do Vercel
Blob era exposta direta no HTML (`<a href={item.url}>`). Agora existe
`/api/gallery-media/[mediaId]`, espelhando `/api/files/[fileId]` e
`/api/library-items/[libraryItemId]`.

Nenhuma coleção nova foi criada; nenhuma rota antiga (`/arquivos`,
`/biblioteca`, `/galeria`, `/downloads`) foi alterada ou removida.

## 11.6a Pesquisa, descoberta e coleções (Estágio 2 da evolução — não confundir com a "Etapa 2" do roadmap em §11.6 abaixo)

Primeira coleção Firestore nova da evolução do Acervo: `archiveCollections`
(`packages/domain/src/modules/archive`), uma ficha editorial que **referencia**
itens existentes pelo ID composto da Etapa 1 (`itemIds: string[]`) — nunca
copia o registro de origem. RBAC próprio (`archiveCollection`, ação `admin`
gerencia, `membro` só lê) em vez de reaproveitar `file`/`libraryItem`/
`gallery`, já que uma coleção não é dona de nenhum binário.

Novas rotas do Irmão:

- `/acervo/pesquisar` — pesquisa federada completa (a busca que já existia
  embutida em `/acervo` virou uma função compartilhada,
  `apps/web/src/modules/archive/lib/search-archive.ts`, reaproveitada pelos
  dois lugares).
- `/acervo/descobrir` — coleções publicadas em destaque + itens adicionados
  recentemente.
- `/acervo/colecoes` e `/acervo/colecoes/[slug]` — lista e detalhe de
  coleções publicadas; o detalhe resolve cada `itemId` via
  `resolveArchiveItem` (mesma função da Etapa 1) e ignora silenciosamente
  qualquer item que não resolva mais.

Administração em `/admin/acervo/colecoes` (nova aba, mesmo padrão de
`ADMIN_AREA_TABS`): criar coleção (metadados), depois editar para
selecionar itens (checkboxes sobre a mesma busca federada) e publicar —
segue o mesmo fluxo em duas etapas de Álbum→Mídia da Galeria.

`archiveCollection` foi registrado com `withAudit` no container — ao
contrário dos 7 repositórios de Acervo (file/library/gallery) que a
auditoria original da Etapa 1 encontrou sem cobertura, a coleção já nasce
auditada.

## 11.6b Fotografias, documentos, biblioteca e audiovisual (Estágio 3)

Quatro telas editoriais dedicadas, cada uma reaproveitando os casos de uso
administrativos já existentes (nenhum novo caso de uso de leitura foi
criado) e convergindo para `/acervo/item/[id]`:

- `/acervo/documentos` — documentos publicados e ainda não catalogados na
  Biblioteca, com filtro por categoria (`FileCategory`).
- `/acervo/biblioteca` — itens catalogados, com filtro por categoria
  (`LibraryCategory`, só categorias de topo).
- `/acervo/fotografias` — álbuns da Galeria, com filtro pela `categoria`
  livre do álbum.
- `/acervo/audiovisual` — todo conteúdo `tipo: 'video'`, seja de
  `FileAsset` (Documentos) seja de `GalleryMedia` (Galeria), reunido numa
  única lista. **Não existe um "áudio" como tipo suportado** em
  `FILE_KINDS`/`GALLERY_MEDIA_KINDS` — a tela não inventa suporte a um tipo
  de mídia que o modelo de dados não tem.

Dois componentes de mídia novos em `packages/ui`, usados pela página do
Item do Acervo (e reaproveitáveis pelas telas acima):

- `VideoPlayer` — `<video>` nativo do navegador, sem dependência nova.
  Legendas/transcrição continuam fora de escopo (Etapa 4 futura do
  roadmap).
- `PdfViewer` — `<iframe>` apontando para o proxy autenticado (renderização
  nativa do navegador do PDF, sem `pdfjs-dist`/`DOMMatrix` — mesma cautela
  já registrada no incidente conhecido desses pacotes em runtime
  serverless). Alguns navegadores móveis não renderizam PDF embutido; por
  isso o botão "Visualizar" (nova aba) continua sendo o caminho principal
  garantido, e o `PdfViewer` é só a prévia opcional em tela.

Os 4 tiles de "Explore o Acervo" em `/acervo` passaram a apontar para estas
telas dedicadas (`/acervo/documentos`, `/acervo/biblioteca`,
`/acervo/fotografias`) em vez das rotas legadas — que continuam existindo e
funcionando sem alteração (`/arquivos`, `/biblioteca`, `/galeria`,
preservadas por compatibilidade).

## 11.6c Pessoas, gestões, eventos e linha do tempo (Estágio 4)

Diferente dos Estágios 1-3 (documentos, biblioteca, fotografias — itens
binários que convergem para `/acervo/item/[id]`), pessoas, gestões e
eventos já têm identidade e rotas próprias no domínio (`Member`,
`BoardTerm`, `Event`) — a Regra de Preservação 6 ("utilize referências aos
IDs canônicos") vale aqui em vez da convergência por ID composto: estas
telas referenciam e navegam pelos IDs reais de `boardTerms`/`members`, sem
criar nenhuma coleção nova.

Novas rotas do Irmão:

- `/acervo/gestoes` e `/acervo/gestoes/[gestaoId]` — lista de gestões e
  detalhe com a Diretoria completa (`BoardPositionAssignment` resolvido
  contra `Member`). Não existia nenhuma tela de Diretoria para o Irmão
  antes deste Estágio — só a administração (`/admin/pessoas/gestoes`).
- `/acervo/pessoas` e `/acervo/pessoas/[memberId]` — trajetória
  institucional. A listagem deriva de `BoardTerm` + `BoardPositionAssignment`
  (quem já ocupou algum cargo), sem nova consulta de agregação; o detalhe
  usa `MemberPositionHistory.listByMemberId` — ledger já mantido por
  `AssignBoardPositionUseCase` a cada atribuição de cargo, nunca lido em
  nenhuma tela até este Estágio.
- `/acervo/eventos` — registro histórico (eventos com `dataFim` no
  passado), reaproveitando `ListAllEventsUseCase` já existente. Não
  duplica `/agenda` (que é operacional: próximos eventos + confirmação de
  presença) nem cria uma nova página de detalhe — cada card linka direto
  para a rota canônica já existente `/eventos/[eventId]`.
- `/acervo/linha-do-tempo` — mescla gestões e eventos passados em uma
  lista cronológica agrupada por ano, textual e sem gráfico. É a base
  concreta da exigência da Regra de Preservação 11 para a futura
  "Constelação da Memória": nenhuma informação poderá existir somente no
  grafo, e esta página já é a alternativa textual completa antes mesmo do
  grafo existir.

**Recorte de campos seguros em `/acervo/pessoas/[memberId]`** — esta é uma
página institucional compulsória (todo Irmão com cargo aparece, sem opt-in),
diferente da Central VL6 (`/irmaos`, autoatendimento voluntário). Por isso o
identity card expõe deliberadamente só `nomeCompleto`, `fotoUrl`, `grau` e
as 3 datas maçônicas (iniciação/elevação/exaltação) — nunca e-mail,
telefone, endereço, cônjuge, profissão ou observações administrativas, os
mesmos campos que a Central já trata como voluntários. Quando o Irmão tem
perfil publicado na Central (`PublicationSettings.profilePublished`), a
página exibe um link cruzado para `/irmaos/[memberId]` em vez de duplicar
esse conteúdo.

A aba "Constelação da Memória" em `/acervo` (até então apenas
ilustrativa) passou a linkar para estas 4 rotas reais.

### Etapa 2 — catalogação e coleções

- Item do Acervo e ficha documental;
- coleções e tags;
- níveis de acesso;
- upload com preservação do original;
- revisão antes da publicação;
- migração assistida dos dados existentes.

### Etapa 3 — memória relacionada

- pessoas e trajetórias;
- gestões;
- eventos;
- linha do tempo;
- Constelação da Memória;
- contribuições dos Irmãos com moderação.

### Etapa 4 — pesquisa avançada

- indexação de texto;
- OCR;
- transcrição de áudio e vídeo;
- pesquisa semântica;
- exposições virtuais;
- sugestões de tags e duplicidades com revisão humana.

Reconhecimento facial não integra o escopo. A identificação de pessoas será
feita por catalogação humana, com consentimento e auditoria.

## 11.7 Critérios de qualidade

- WCAG AA e navegação completa por teclado;
- nenhum conteúdo restrito entregue ao navegador sem autorização de servidor;
- metadados de origem e confiabilidade em todo item histórico;
- URLs antigas preservadas ou redirecionadas durante migrações;
- arquivos originais imutáveis e derivados regeneráveis;
- nenhuma contagem ou informação histórica inventada na interface;
- toda publicação e alteração relevante registrada em auditoria.
