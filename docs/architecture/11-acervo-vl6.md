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

## 11.6 Etapas futuras

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
