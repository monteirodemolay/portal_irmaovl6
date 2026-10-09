# 16. Mapa de unificação do Back-office VL6

> Levantamento de 09/10/2026 para reduzir redundâncias administrativas sem apagar relações, dados ou capacidades existentes. Este documento complementa a Ficha Única (doc. 15) e passa a definir **fonte da verdade, rota de alimentação e destino das telas redundantes**.

## 16.1 Regra-mãe

O Portal não deve ter vários cadastros concorrentes para o mesmo fato, pessoa, gestão, arquivo ou publicação.

**Cadastrar uma vez. Relacionar sempre. Editar na origem. Refletir nas visões dependentes. Excluir somente após analisar dependências.**

Unificar não significa transformar tudo em uma coleção única no Firestore. Os domínios continuam separados quando possuem responsabilidades próprias; o que deixa de existir é a exigência de o Administrador repetir a mesma informação em telas diferentes.

## 16.2 Classificação funcional do que existe hoje

A Administração atual reúne sete grandes entradas visíveis: Central de Controle, Registrar/Publicar, Pessoas e Loja, Memória/Biblioteca, Conhecimento, Cripta e Configurações/Auditoria. Por trás delas ainda existem muitas rotas especializadas.

Essas rotas passam a ser classificadas em quatro classes:

- **Canônica** — local normal para criar/editar a entidade fonte.
- **Visão dependente** — exibe ou complementa uma entidade canônica; não deve recriar seus dados.
- **Cadastro mestre** — entidade independente reutilizada por vários módulos.
- **Manutenção avançada** — migração, reconciliação, auditoria, lixeira, duplicidade, reparo ou operação excepcional.

## 16.3 Fontes oficiais de verdade

| Conceito | Fonte oficial | Quem pode referenciar | Regra de edição |
| --- | --- | --- | --- |
| Acontecimento, sessão, evento, visita, atividade datada | `Event` | Agenda, News, Announcement, Publication, ArchiveItem, Linha do Tempo, Constelação | título, data, local, classificação, gestão e entidade são alterados no `Event` |
| Irmão | `Member` | diretório, presença, Acervo, Conhecimento, Comunicação, Cripta, negócios | dados pessoais/institucionais são alterados no cadastro do Irmão |
| Usuário/login | `User` + Firebase Auth | sessão, papéis, login | nunca criar outro Irmão para representar conta de acesso |
| Gestão | `BoardTerm` | Event, ArchiveItem, Acervo, histórico | cadastrar uma vez; associação por data quando aplicável |
| Entidade paramaçônica | cadastro de entidade paramaçônica | Event, Agenda, perfis, comunidade | `Event.paramasonicEntityId` referencia a entidade existente |
| Notícia | `News` | Ficha, página pública, importador, Acervo | texto/editorial pertence à notícia; fato histórico permanece no `Event` via `eventId` |
| Aviso | `Announcement` | Ficha, Central de Avisos, notificações | conteúdo/expiração pertencem ao aviso; acontecimento vem de `eventId` |
| Arte/comunicação | `Publication` | Ficha, Central de Comunicação | `sourceType/sourceId` referencia Evento/Member; nunca recriar origem |
| Item de memória | `ArchiveItem` | Acervo, Linha do Tempo, Constelação | exige `eventId`; proveniência deve ser preservada |
| Mídia do Acervo | `ArchiveMedia` + `MediaAsset` | álbum, Ficha, Constelação, identificação de pessoas | herda proveniência do `ArchiveItem`; não cadastrar evento novamente |
| Livro/obra bibliográfica | `LibraryItem` e entidades de circulação | Biblioteca, Conhecimento, Acervo quando migrado | Biblioteca continua domínio mestre próprio |
| Documento avulso legado/institucional | `FileAsset` | Downloads/arquivos; migração assistida ao Acervo | se pertencer a acontecimento, destino preferencial é `ArchiveItem/ArchiveMedia`; legado não é apagado automaticamente |
| Álbum legado | `GalleryAlbum/GalleryMedia` | migração assistida ao Acervo | não criar novos fluxos paralelos; preservar origem até migração validada |
| Auditoria | `auditLogs` | Central, Ficha, relatórios | nunca criar segunda trilha concorrente |
| Termos/Privacidade | versões legais e aceites | login/configurações | domínio independente e versionado |
| Conhecimento | entidades do módulo Knowledge | Irmãos, Biblioteca | domínio independente; pode referenciar livros/arquivos existentes |
| Cripta | entidades/arquivos próprios da Cripta | titular e administração autorizada | domínio excepcional; não fundir com Acervo ou Comunicação |

## 16.4 Núcleo Acontecimento: onde está a maior redundância

O maior conjunto de telas concorrentes está em torno de um mesmo fato histórico:

- `/admin/conteudo/agenda`;
- `/admin/conteudo/noticias`;
- `/admin/conteudo/avisos`;
- `/admin/comunicacao` e `/admin/comunicacao/publicacoes`;
- `/admin/acervo/publicar`;
- `/admin/acervo/galeria`;
- `/admin/acervo/arquivos`;
- `/admin/acervo/catalogacao`;
- `/admin/acervo/relacoes`;
- `/admin/publicacoes/[eventId]`.

A rota canônica para operação diária passa a ser **`/admin/publicacoes/[eventId]`**. As demais rotas continuam existindo enquanto forem necessárias para consulta global, conteúdo realmente avulso, migração ou manutenção.

### Regra prática

Se o Administrador estiver cadastrando algo porque **aconteceu/acontecerá alguma coisa**, ele não deve decidir entre Agenda, Notícias, Avisos, Comunicação, Galeria e Acervo. Ele cria/abre o Acontecimento e trabalha pela Ficha.

`Event` já contém título, descrição, local, datas, contexto, entidade paramaçônica, gestão, nível de acesso, capa e classificação de sessão. Esses campos não devem ser repetidos como fonte concorrente em outros módulos.

`News.eventId` e `Announcement.eventId` já permitem que conteúdos editoriais dependam do Acontecimento sem copiar sua identidade histórica. `Publication.sourceType/sourceId` segue a mesma estratégia. `ArchiveItem` exige `eventId`, e `ArchiveMedia` herda o vínculo do item-pai.

## 16.5 Acervo: o que é núcleo e o que é legado/especializado

Hoje a área administrativa do Acervo expõe muitas ferramentas: Publicar, Documentos, Biblioteca, Fotografias, Coleções, Relações, Exposições, Catalogação, Contribuições, Lixeira, Duplicidade e Métricas, além de rotas de migração.

### Permanecem como operação/cadastro próprio

- **Biblioteca** — domínio físico/digital, circulação, tombo, exemplares, estantes, reservas, baixas e histórico;
- **Coleções** — agrupamentos curatoriais reutilizáveis;
- **Contribuições** — caixa de entrada de material enviado pelos Irmãos;
- **Exposições** — composição curatorial quando houver uso real.

### Devem ficar subordinados à Ficha quando houver Acontecimento

- publicação de fotos/vídeos/documentos;
- definição de capa;
- identificação de pessoas;
- metadados do álbum/mídia;
- relações com evento/gestão;
- publicação/ocultação do item;
- elegibilidade para Linha do Tempo/Constelação.

### Devem ser tratados como manutenção avançada/legado

- Galeria legada (`GalleryAlbum/GalleryMedia`);
- Arquivos legados (`FileAsset`) quando equivalerem a documentos históricos já migráveis;
- Catalogação técnica separada quando não for necessária à alimentação cotidiana;
- Relações manuais de grafo;
- Duplicidade;
- Métricas detalhadas;
- Lixeira;
- iniciação/elevação/exaltação e outras rotas de migração/backfill.

**Importante:** legado não deve ser apagado por simplificação visual. O `ArchiveItem` possui marcadores de proveniência (`origemGalleryAlbumId`, `origemFileAssetId`, `origemLibraryItemId`, `origemNewsId`), justamente para permitir transição idempotente e auditável.

## 16.6 Pessoas e Loja

A área atual inclui Irmãos, Gestões, Usuários, Permissões, Paramaçônicas, Loja, Central VL6 e Negócios & Serviços, além de migração de situação.

A separação correta é:

### Cadastros mestres

- **Irmãos (`Member`)** — pessoa institucional;
- **Gestões (`BoardTerm`)** — período/nominata;
- **Paramaçônicas** — entidades relacionadas;
- **Loja/Tenant** — identidade institucional.

### Infraestrutura de acesso

- **Usuários (`User`)** — conta/login, sem duplicar dados do Irmão;
- **Permissões/Roles** — autorização, não cadastro de pessoa.

### Extensões da pessoa

- **Central VL6** e **Negócios & Serviços** devem trabalhar a partir do `Member.id`; jamais criar um segundo cadastro de pessoa.

### Manutenção avançada

- migração/reconciliação de situação do Irmão;
- reparos históricos;
- operações em lote.

## 16.7 Conteúdo e Comunicação

### Conteúdo ligado a Acontecimento

- Notícia;
- Aviso;
- arte de divulgação;
- Instagram/links editoriais;
- mídia histórica.

Tudo deve ser criado/editado a partir da Ficha quando houver `eventId`.

### Conteúdo realmente independente

- frase inspiracional;
- link útil;
- notificação pessoal/administrativa sem fato histórico;
- campanha manual de comunicação que não deriva de Evento ou Member.

Esses registros podem continuar com telas próprias porque não existe uma entidade anterior que deva ser referenciada.

## 16.8 Configurações, auditoria e manutenção

Configurações deve conter apenas administração transversal:

- Geral/identidade técnica do tenant;
- Integrações;
- Termos e Privacidade;
- permissões técnicas que não sejam cadastro de pessoa;
- manutenção excepcional.

**Auditoria aparece na Central e nas Fichas como visão**, mas sua fonte continua única. A tela detalhada de auditoria pode permanecer como consulta avançada.

## 16.9 Conhecimento e Cripta

Esses dois módulos não devem ser artificialmente absorvidos pela Ficha do Acontecimento.

- **Conhecimento** é um domínio educacional. Deve reutilizar `Member` para aluno/instrutor e `LibraryItem`/arquivos existentes quando aplicável, sem duplicar pessoas ou livros.
- **Cripta** é um domínio de custódia excepcional. Deve reutilizar `Member` como titular e identidade/autorização já existentes, mas manter ciclo, armazenamento e regras próprias.

## 16.10 Matriz das telas: manter, incorporar, ocultar da rotina ou remover futuramente

| Área/rota | Classificação alvo | Ação |
| --- | --- | --- |
| `/admin` | canônica | manter como Central de Controle |
| `/admin/publicacoes` | canônica | tornar lista principal de Acontecimentos/Fichas |
| `/admin/publicacoes/novo` | canônica | única entrada normal de fato datado |
| `/admin/publicacoes/[eventId]` | canônica | concentrar CRUD e integridade do acontecimento |
| `/admin/conteudo/agenda` | visão/manutenção | impedir novo fluxo paralelo; editar fato pela Ficha |
| `/admin/conteudo/noticias` | visão/manutenção | lista global; criação ligada a fato deve partir da Ficha |
| `/admin/conteudo/avisos` | visão/manutenção | lista global; criação ligada a fato deve partir da Ficha |
| `/admin/comunicacao` | visão especializada | campanhas/modelos; Evento usa Ficha |
| `/admin/comunicacao/publicacoes/*` | especializada | preservar; origem deve ser referência, não cópia |
| `/admin/acervo/publicar` | especializada | item histórico avulso/migração; Evento usa Ficha |
| `/admin/acervo/galeria` | legado | manter leitura/migração até paridade comprovada |
| `/admin/acervo/arquivos` | legado/avulso | manter documentos independentes; Evento usa Acervo da Ficha |
| `/admin/acervo/biblioteca` | cadastro mestre | manter |
| `/admin/acervo/colecoes` | cadastro mestre curatorial | manter |
| `/admin/acervo/relacoes` | avançada | ocultar da rotina; relações automáticas primeiro |
| `/admin/acervo/catalogacao` | avançada | usar quando necessário; não exigir no cadastro básico |
| `/admin/acervo/contribuicoes` | fila operacional | manter |
| `/admin/acervo/lixeira` | avançada | manter |
| `/admin/acervo/duplicidade` | avançada | manter |
| `/admin/acervo/metricas` | relatório | preferir Central; manter detalhamento |
| migrações do Acervo | avançada | não expor na rotina |
| `/admin/pessoas/irmaos` | cadastro mestre | manter |
| `/admin/pessoas/gestoes` | cadastro mestre | manter |
| `/admin/pessoas/paramaconicas` | cadastro mestre | manter |
| `/admin/pessoas/loja` | cadastro mestre | manter |
| `/admin/pessoas/usuarios` | infraestrutura | manter, fora da rotina de cadastro de Irmão |
| `/admin/pessoas/permissoes` | infraestrutura | manter |
| `/admin/pessoas/central` | extensão | referenciar `Member` |
| `/admin/pessoas/negocios` | extensão | referenciar `Member` |
| migrações de pessoas | avançada | não expor na rotina |
| `/admin/configuracoes/auditoria` | relatório avançado | Central/Ficha mostram resumo; esta mantém detalhe |
| `/admin/configuracoes/manutencao` | avançada | manter isolada |
| `/admin/conhecimento/*` | domínio próprio | manter, reutilizando cadastros mestres |
| `/admin/cripta/*` | domínio excepcional | manter separado; reutilizar `Member`/autorização |

## 16.11 Política obrigatória para novos recursos

Antes de criar qualquer tela, coleção ou formulário administrativo, responder:

1. Qual entidade já existente representa essa informação?
2. Existe uma fonte oficial para o dado?
3. O novo recurso pode guardar apenas o ID da entidade existente?
4. O campo é propriedade do novo módulo ou pertence à entidade de origem?
5. Como a edição na origem será refletida nas demais visões?
6. O que acontece se a origem for arquivada/excluída?
7. A operação deve estar na Ficha, em cadastro mestre ou em manutenção avançada?

Se o novo formulário pedir título, data, local, pessoa, gestão ou entidade que já existem no contexto, a primeira opção deve ser **selecionar/vincular**, não recadastrar.

## 16.12 Política de exclusão

Nenhuma exclusão administrativa pode cortar relações silenciosamente.

Antes da ação, o sistema deve levantar dependências conhecidas e escolher uma das estratégias:

- **arquivar** — padrão para memória histórica;
- **desvincular** — quando o conteúdo continua válido sem a relação;
- **substituir/mesclar** — quando há duplicidade;
- **bloquear** — quando a exclusão deixaria registros inválidos;
- **excluir definitivamente** — somente em manutenção avançada, com permissão e confirmação explícitas.

A exclusão da entidade de origem nunca deve apagar dependentes por cascata implícita sem uma regra de negócio específica e auditada.

## 16.13 Sequência de unificação com parcimônia

### Fase A — consolidar entrada e navegação

- Ficha Única como operação normal de Acontecimentos;
- remover botões concorrentes de criação quando o conteúdo depende de um Evento;
- manter listas antigas apenas para consulta global/manutenção;
- separar visualmente operação diária de ferramentas avançadas.

### Fase B — edição e exclusão dependentes

- cada Ficha passa a mostrar dependências e integridade;
- edição de campos compartilhados volta à entidade fonte;
- exclusões usam análise de impacto;
- listas antigas apontam para a Ficha quando houver vínculo.

### Fase C — Acervo e legados

- novos álbuns/eventos usam somente `ArchiveItem/ArchiveMedia`;
- Galeria e Arquivos antigos entram em migração assistida, sem destruição da origem;
- após paridade comprovada, rotas legadas deixam a navegação comum e podem virar somente leitura/redirecionamento.

### Fase D — Pessoas, Loja e extensões

- garantir que Central VL6, Negócios, Conhecimento e Cripta referenciem `Member` em vez de copiar identidade;
- unificar seletores e telas de relacionamento.

### Fase E — remoção final de redundâncias

Uma tela só pode ser removida depois de inventário de dependências, migração/redirect, testes e período de transição. A meta não é reduzir número de arquivos a qualquer custo; é reduzir **pontos de entrada concorrentes e fontes de verdade duplicadas**.

## 16.14 Resultado desejado

O Administrador deve pensar em objetos reais, não em coleções técnicas:

- **Aconteceu algo** → Acontecimento/Ficha;
- **é uma pessoa** → Irmão/Pessoa;
- **é um período de gestão** → Gestão;
- **é um livro** → Biblioteca;
- **é uma formação** → Conhecimento;
- **é uma configuração** → Configurações;
- **é uma operação excepcional** → Administração avançada.

Todo o restante deve ser relacionamento, complemento, visualização, relatório ou manutenção sobre essas fontes.
