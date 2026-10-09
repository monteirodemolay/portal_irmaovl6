# 15. Ficha Única Administrativa e fluxo operacional

> Estado proposto/implementado em 09/10/2026 para simplificar a Administração sem desmontar módulos já existentes.

## 15.1 Princípio

O administrador informa o fato uma vez. O **Acontecimento (`Event`)** passa a ser a raiz operacional para tudo o que depende de um fato datado:

`Acontecimento → Comunicação → Mídias → Acervo → Memória`

A rota canônica é `/admin/publicacoes/[eventId]`, apresentada como **Ficha Única do Acontecimento**.

A Ficha não substitui tecnicamente `News`, `Announcement`, `ArchiveItem`, `ArchiveMedia`, `Publication` nem outros modelos. Ela os coordena pela chave do acontecimento e mantém suas regras, permissões e repositórios. Isso reduz duplicação de telas sem introduzir uma nova entidade central.

## 15.2 O que fica dentro da Ficha

- dados do acontecimento: título, descrição, data, horário, local e classificação;
- gestão correspondente à data;
- entidade paramaçônica relacionada, quando houver;
- notícias vinculadas, inclusive criação, edição e publicação;
- avisos vinculados, inclusive alcance quando disponível;
- links externos/Instagram associados à notícia;
- artes e registros de comunicação;
- fotos, vídeos e documentos vinculados ao Acervo;
- situação de publicação do Acervo e elegibilidade para Constelação;
- quantidade de pessoas identificadas nas mídias;
- trilha recente de auditoria dos registros relacionados;
- análise de impacto antes da retirada do acontecimento.

## 15.3 Inserção

A entrada comum é `/admin/publicacoes/novo`.

1. O administrador cadastra o acontecimento.
2. `createWorkspaceEventAction` cria o `Event` e redireciona para a Ficha.
3. A partir da Ficha são adicionados notícia, aviso, mídia e comunicação.
4. Dados compartilhados permanecem no `Event`; conteúdo editorial mantém seus campos próprios.

A data histórica do acontecimento e as datas editoriais de publicação permanecem conceitos distintos.

## 15.4 Edição

Campos que descrevem o fato são editados na seção **Dados do acontecimento**. A edição continua usando `EventForm` e `updateWorkspaceEventAction`, preservando validações, sincronização com Google Agenda e notificações já existentes.

As demais áreas editam seus próprios registros, mas sempre dentro do contexto visual da Ficha quando houver `eventId`.

## 15.5 Exclusão e ciclo de vida

A Ficha mostra uma análise de impacto com notícias, avisos, itens do Acervo, fotos, vídeos e documentos relacionados.

A ação comum **Arquivar acontecimento** reutiliza a exclusão lógica já existente de `Event`. Não existe cascata destrutiva automática a partir da Ficha. Registros editoriais e mídias relacionados são preservados para revisão, evitando perda histórica acidental.

Exclusão física, reconciliações, migrações e operações destrutivas em lote permanecem em Administração avançada e exigem permissões próprias.

## 15.6 Integridade da Ficha

A interface calcula um indicador operacional, sem criar um novo campo persistido. O indicador observa:

- dados mínimos do acontecimento;
- gestão correspondente;
- comunicação vinculada;
- mídia visual;
- item publicado no Acervo;
- elegibilidade para a Constelação.

O percentual é um guia de cobertura da memória, não uma regra de validade jurídica ou obrigatoriedade editorial.

## 15.7 Rastreabilidade

A Ficha consulta a trilha de `auditLogs` já existente e mostra ações recentes cujo `entidadeId` pertence ao acontecimento ou aos registros relacionados carregados na ficha. A auditoria completa continua em `/admin/configuracoes/auditoria`.

Nenhuma segunda fonte de auditoria deve ser criada.

## 15.8 Classificação das rotas administrativas

### Operação diária — priorizar no menu

- `/admin` — Central de Controle;
- `/admin/publicacoes` — lista/planejamento de acontecimentos e conteúdos;
- `/admin/publicacoes/novo` — entrada única de novo acontecimento;
- `/admin/publicacoes/[eventId]` — Ficha Única;
- `/admin/pessoas` — cadastros mestres de pessoas e Loja;
- `/admin/acervo` — memória e Biblioteca;
- `/admin/conhecimento` — formação;
- `/admin/cripta` — módulo excepcional;
- `/admin/configuracoes` — configurações e auditoria.

### Cadastro mestre — manter separado

- Irmãos, usuários, papéis e permissões;
- gestões/nominatas;
- identidade da Loja;
- entidades paramaçônicas;
- Biblioteca, exemplares e estantes;
- modelos de comunicação;
- termos, privacidade e integrações.

### Operações incorporadas à Ficha quando houver acontecimento

- `/admin/conteudo/agenda`;
- `/admin/conteudo/noticias`;
- `/admin/conteudo/avisos`;
- `/admin/comunicacao`;
- `/admin/acervo/publicar`;
- `/admin/acervo/galeria`;
- vínculos de mídia, pessoas e relações do Acervo.

Essas rotas permanecem disponíveis como manutenção avançada durante a transição.

### Manutenção avançada — não expor como fluxo cotidiano

- migrações de classificação/situação;
- reconciliações de iniciação, elevação e exaltação;
- importações históricas;
- conferência de duplicidades;
- lixeiras e baixas;
- ferramentas de laboratório da Cripta;
- jobs e rotinas de reparo/backfill.

## 15.9 Regra para remoção de telas antigas

Nenhuma rota deve ser excluída apenas porque a Ficha passou a oferecer a mesma operação.

Uma rota antiga só pode ser redirecionada/removida depois de comprovar:

1. cobertura funcional equivalente na Ficha ou Central;
2. manutenção das permissões/RBAC;
3. preservação de links profundos ou redirecionamento explícito;
4. ausência de jobs, testes ou integrações dependentes;
5. teste autenticado em produção;
6. período de transição sem regressões.

## 15.10 Direção futura

A Central de Controle deve abrir e acompanhar Fichas, não replicar todos os formulários. A Ficha deve concentrar o ciclo do acontecimento. Os módulos especializados continuam responsáveis por seus domínios internos.

Essa separação permite simplificar a experiência administrativa sem reescrever o modelo de dados nem perder ferramentas já construídas.
