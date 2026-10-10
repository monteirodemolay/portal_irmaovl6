# Sistema administrativo VL6 — tiles, formulários e criação contextual

## Objetivo

A Administração deve parecer um único sistema, não um conjunto de telas independentes. A regra operacional é:

> Cadastrar uma vez. Relacionar sempre. Editar na origem. Refletir nas visões dependentes. Excluir somente após analisar dependências.

Para Acontecimentos, o fluxo canônico permanece:

`Agenda/Calendário → Acontecimento → complementos → Acervo → Memória → Auditoria`.

## Padrão visual

A referência de interação são os tiles do Windows 8, reinterpretados para um painel contemporâneo:

- blocos retangulares com hierarquia clara;
- ação principal grande e imediatamente reconhecível;
- estados visíveis por texto e ícone, nunca apenas por cor;
- áreas operacionais abertas; manutenção técnica recolhida;
- layout responsivo, com alvos de toque de no mínimo 44 px;
- foco de teclado e mensagens de erro associados ao campo;
- linguagem administrativa sem jargão técnico desnecessário.

## Shell administrativo

A navegação principal é organizada por domínios:

1. Central de Controle;
2. Acontecimentos;
3. Pessoas e Loja;
4. Acervo e Biblioteca;
5. Conhecimento;
6. Cripta;
7. Sistema e Auditoria.

`/admin/conteudo` e `/admin/comunicacao` permanecem como rotas técnicas/compatibilidade do domínio Acontecimentos, sem competir como entradas principais.

## Classificação de rotas

### Operação normal

- `/admin`
- `/admin/publicacoes`
- `/admin/publicacoes/novo`
- `/admin/publicacoes/[eventId]`
- `/admin/pessoas`
- `/admin/acervo`
- `/admin/conhecimento`
- `/admin/cripta`
- `/admin/configuracoes`

### Cadastro mestre

Cadastros reutilizáveis que alimentam os formulários principais, como pessoas, gestões, entidades, modelos e demais referências institucionais.

### Administração avançada

Telas especializadas que continuam disponíveis para saneamento, auditoria, manutenção e migração, mas ficam recolhidas e não concorrem com o fluxo cotidiano.

### Compatibilidade

Rotas históricas de Agenda, Notícias, Avisos, Comunicação e estruturas legadas do Acervo podem continuar resolvendo URLs antigas. Quando o registro está ligado a um Acontecimento, a interface deve conduzir para a Ficha Única.

## Padrão de tiles

Cada tela operacional deve responder três perguntas sem abrir outra tela:

1. o que existe;
2. o que está pendente;
3. qual é a próxima ação.

Nos Acontecimentos, os tiles principais são:

- Próximos acontecimentos;
- Realizados aguardando complementos;
- Memórias publicadas;
- Registros independentes/legados.

Cada Acontecimento deve aparecer uma única vez. Notícia, aviso, arte, mídia e item de Acervo são indicadores da mesma ficha quando possuem `eventId`.

## Padrão de formulários

### Camada essencial

A primeira tela deve pedir somente o necessário para o registro existir:

- tipo;
- título;
- data/hora;
- local;
- classificação mínima aplicável.

### Camada complementar

Descrição, capa, capacidade, presença, traje, chegada sugerida, anexos e detalhes excepcionais devem ser apresentados depois do essencial ou em área claramente secundária.

### Barra de ação fixa

Formulários longos devem manter as ações disponíveis no rodapé da janela:

- Cancelar/Voltar;
- Salvar;
- Salvar e continuar, quando o fluxo justificar.

O usuário não deve precisar retornar ao final de uma página extensa para gravar alterações.

## Campo inteligente: Local

A primeira implementação não cria uma segunda fonte de verdade para locais. As sugestões são derivadas dos locais já usados em Acontecimentos do tenant.

Funcionamento:

1. o usuário digita;
2. o campo sugere locais já conhecidos;
3. se não houver correspondência, aparece `Local ainda não utilizado`;
4. `Usar este novo local` abre um painel lateral de confirmação, sem sair do formulário;
5. ao salvar o Acontecimento, o local passa naturalmente a integrar as sugestões futuras, pois já existe em um registro canônico.

Essa estratégia evita um cadastro mestre artificial e mantém o dado verificável. Se futuramente houver necessidade de endereço estruturado, geolocalização ou múltiplos atributos de local, a evolução pode introduzir uma entidade `Venue` sem quebrar os Acontecimentos existentes.

## Inclusão e acessibilidade

- campos com labels persistentes;
- ajuda curta junto ao campo;
- não usar placeholder como único rótulo;
- feedback de sucesso e erro em texto;
- navegação completa por teclado;
- `aria-pressed`, `aria-expanded`, `aria-live` e `role=status/alert` quando aplicável;
- contraste suficiente;
- áreas clicáveis grandes;
- ações destrutivas separadas e confirmadas;
- comportamento responsivo para celular.

## Ordem de implantação

### Fase 1 — Acontecimentos

- painel por tiles;
- uma ficha por Acontecimento;
- derivados agrupados por `eventId`;
- formulário de criação simplificado;
- Local inteligente;
- barra de ação fixa.

### Fase 2 — Acervo

- mesma gramática visual;
- memórias, pendências, saneamento e auditoria;
- legado apresentado como proveniência, não como segundo sistema.

### Fase 3 — Pessoas e Loja

- Ficha única do Irmão;
- gestões, funções, trajetórias e vínculos em tiles contextuais.

### Fase 4 — Biblioteca e Conhecimento

- formulários consistentes;
- criação contextual de autores/categorias quando necessário;
- ações principais fixas.

### Fase 5 — Sistema

- configurações e auditoria com a mesma navegação;
- ferramentas técnicas recolhidas em Administração avançada.
