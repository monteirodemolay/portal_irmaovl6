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

## 11.6d Constelação da Memória e Exposições Virtuais (Estágio 5)

Duas coleções novas e independentes, ambas puramente referenciais (nunca
copiam o registro de origem):

### Constelação da Memória — `archiveRelations`

Uma aresta entre dois nós já existentes no domínio — `origemTipo`/`origemId`
e `destinoTipo`/`destinoId` (`archiveItem` usa o ID composto do Estágio 1;
`member`/`boardTerm`/`event`/`archiveCollection` usam o ID canônico da
própria entidade), mais um `tipo` de relação (`retrata`, `participou_de`,
`pertence_a`, `ocorreu_durante`, `relacionado_a`) e uma descrição opcional.
Administração em `/admin/acervo/relacoes` (criar via seletor agrupado por
tipo de nó, reaproveitando as mesmas fontes de dados já usadas em cada área
— `searchMembers`, `boardTerm.listByTenant`, `listAllEvents`,
`listArchiveCollections`, `loadArchiveSearchResults`; remover é sempre soft
delete, nunca apaga o documento).

`ConstellationGraph` (`packages/ui`) é o componente visual: um SVG
puramente decorativo (`aria-hidden`, layout determinístico por
trigonometria, **sem animação nem simulação em JS**) mostrando até 8 nós ao
redor do centro, acompanhado **sempre** — não opcionalmente — de uma lista
HTML real com todas as relações (link de verdade, focável por teclado,
visível mesmo sem CSS/SVG). Esse par gráfico+lista é a materialização
concreta da exigência do usuário de que "nenhuma informação poderá existir
somente no gráfico": a lista não é um fallback de acessibilidade, é a fonte
de verdade que o SVG apenas ilustra.

Cada página do Acervo que já tem ID canônico próprio — Item
(`/acervo/item/[id]`), Pessoa (`/acervo/pessoas/[memberId]`), Gestão
(`/acervo/gestoes/[gestaoId]`), Coleção (`/acervo/colecoes/[slug]`) — ganhou
uma seção "Constelação da Memória" que só aparece quando existe ao menos
uma relação resolvível (nunca uma seção vazia). `/acervo/constelacao` é o
índice global, com a mesma garantia textual em escala do tenant inteiro.
Deliberadamente **não** foi adicionada uma seção de relações à rota
canônica pré-existente `/eventos/[eventId]` — eventos participam da
Constelação como nó, mas essa rota não é território do Acervo e não foi
tocada.

### Exposições Virtuais — `archiveExhibitions`

Diferente de `archiveCollections` (Estágio 2 — agrupamento plano de itens),
uma exposição tem estrutura narrativa: uma lista ordenada de `secoes`, cada
uma com `titulo` + `texto` curatorial próprios + seus `itemIds` (IDs
compostos do Estágio 1). RBAC próprio (`archiveExhibition`) pelo mesmo
motivo do `archiveCollection` — não é dona de nenhum binário.

Fluxo administrativo em duas telas, mesmo padrão de
`/admin/acervo/colecoes`: `/admin/acervo/exposicoes/novo` cria só os
metadados; `/admin/acervo/exposicoes/[id]` edita metadados e as seções
(editor client-side com `useState`, adicionar/remover seção e marcar itens
por checkbox sem round-trip ao servidor a cada mudança — as seções via
`useState` são serializadas para um único campo oculto JSON no submit,
evitando a complexidade de FormData com array de objetos).

`/acervo/exposicoes` lista publicadas; `/acervo/exposicoes/[slug]` renderiza
a narrativa completa — cada seção como um bloco "Parte N" com o texto
curatorial seguido dos itens resolvidos via `resolveArchiveItem` (mesma
função do Estágio 1), em formato editorial de leitura longa, não grade
densa.

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

## 11.6e Catalogação formal (Estágio 6)

Camada de enriquecimento aditiva — `archiveCatalogEntries` — pensada como o
primeiro passo real em direção à "ficha documental" da Etapa 2 do roadmap,
sem antecipar a migração completa: cada ficha referencia um item já
existente pelo ID composto do Estágio 1 (`origemId`, 1:1, único por
`tenantId`+`origemId`) e só acrescenta três campos opcionais — título
curado, contexto histórico (texto livre, até 8000 caracteres) e tags — sem
jamais tocar, migrar ou duplicar o registro de origem (`FileAsset`,
`LibraryItem`, `GalleryAlbum`, `GalleryMedia` continuam intocados). Nasce
como rascunho (`publicado: false`); publicar é uma ação em separado
(`PublishArchiveCatalogEntryUseCase`), mesmo padrão de gate de
`archiveCollection`/`archiveExhibition`.

`GetArchiveCatalogEntryByOrigemIdUseCase` só retorna fichas publicadas —
`resolveArchiveItem` (Estágio 1) consulta essa ficha e, quando existe e está
publicada, preenche `ResolvedArchiveItem.catalogo`; a página
`/acervo/item/[id]` (via `ArchiveItemContent`) passa a exibir um bloco
"Contexto Histórico" entre a mídia e a Procedência, mas só quando há
conteúdo real — item sem ficha, ou com ficha ainda em rascunho, continua
exibindo a página exatamente como antes. Administração em
`/admin/acervo/catalogacao` (listar, criar por seletor do mesmo catálogo
federado de itens do Estágio 1, editar e publicar/despublicar).

Importante: este estágio **não** executa nenhuma migração em massa dos
itens existentes para fichas de catalogação — cada ficha é criada
manualmente, um item por vez, pelo Administrador. Uma eventual migração
assistida (gerar fichas automaticamente a partir dos metadados já
existentes de `FileAsset`/`LibraryItem`, por exemplo) continua sendo uma
ação futura separada, sujeita a plano próprio com testes e rollback antes
de qualquer execução real — nunca automática (Regra de Preservação nº3).

## 11.6f Pesquisa avançada — escopo reduzido (Estágio 7)

A "Etapa 4 — pesquisa avançada" do roadmap (§11.6 acima) lista indexação de
texto, OCR, transcrição de áudio/vídeo, pesquisa semântica e sugestões de
tags/duplicidade. Das cinco, **OCR, transcrição e pesquisa semântica
dependem de infraestrutura de ML externa ao projeto** (serviço de OCR,
speech-to-text, embeddings/busca vetorial) — não são lacunas de código, são
serviços que precisariam ser contratados (custo recorrente, chaves de API,
dados saindo do ambiente). Por decisão do usuário, o Estágio 7 implementou
só o que dá pra fazer com o que já existe no projeto, sem novo serviço
externo:

**Busca textual sobre a catalogação formal** — `loadArchiveSearchResults`
(`apps/web/src/modules/archive/lib/search-archive.ts`) passa a carregar
também as fichas de catalogação publicadas (`archiveCatalogEntries`, só
`publicado: true` — rascunho nunca entra na busca, mesma regra do painel
"Contexto Histórico") e anexa `tituloCurado`+`contextoHistorico`+`tags` de
cada ficha como `catalogText` no resultado correspondente. `matchesArchiveSearch`
passa a considerar esse texto no casamento — um termo que só existe no
contexto histórico curado (nunca no título/descrição original do
documento) agora encontra o item em `/acervo/pesquisar` e `/acervo`. O
`catalogText` entra só na comparação, nunca é exibido no card de resultado.

As funções puras de casamento (`normalizeSearchText`, `matchesArchiveSearch`,
mais os tipos `ArchiveSearchKind`/`ArchiveSearchResult`) foram extraídas
para `archive-search-match.ts` — sem `server-only` — para poderem ser
testadas isoladamente (mesma convenção de `archive-item-id.ts`);
`search-archive.ts` (que tem `server-only` por carregar dados via
container) reexporta tudo, então nenhum import existente quebrou.

**Sugestão de tags duplicadas, com revisão humana** — os dois formulários
de catalogação (`archive-catalog-entry-form.tsx`,
`archive-catalog-entry-edit-form.tsx`) ganharam o componente
`TagSuggestions`: chips com as tags já usadas em outras fichas do tenant
(`collectDistinctTags`, deduplicado por comparação case-insensitive,
preservando a primeira grafia encontrada), clicáveis para acrescentar ao
campo sem duplicar. É sugestão pura — nada é mesclado ou renomeado
automaticamente; o Administrador decide clicar ou digitar uma tag nova.
Não há correspondência aproximada (fuzzy) nem qualquer decisão automática
de "essas duas tags são a mesma coisa".

**Ainda fora de escopo, por decisão explícita:** OCR de documentos
escaneados, transcrição de áudio/vídeo e busca semântica continuam
dependendo de infraestrutura externa não contratada — não foram
fabricados nem simulados. Retomar esse pedaço da Etapa 4 exige antes uma
decisão do usuário sobre provedor, custo e política de dados.

## 11.7 Critérios de qualidade

- WCAG AA e navegação completa por teclado;
- nenhum conteúdo restrito entregue ao navegador sem autorização de servidor;
- metadados de origem e confiabilidade em todo item histórico;
- URLs antigas preservadas ou redirecionadas durante migrações;
- arquivos originais imutáveis e derivados regeneráveis;
- nenhuma contagem ou informação histórica inventada na interface;
- toda publicação e alteração relevante registrada em auditoria.
