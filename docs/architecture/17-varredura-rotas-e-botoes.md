# 17. Varredura de rotas, botões e pontos de entrada

## Objetivo

Manter o Portal VL6 limpo para operação e verificável para administração. A regra é reduzir pontos concorrentes de criação sem apagar capacidades, histórico ou compatibilidade antes da hora.

## Regra operacional

**Acontecimento é a origem de fatos datados.**

Fluxo normal:

`Calendário/Agenda → Acontecimento → Ficha Única → notícia/aviso/comunicação → mídias/documentos → Acervo → Linha do Tempo/Constelação → auditoria`

Quando não existe fato datado real, o registro permanece em seu domínio próprio (Biblioteca, documento institucional, frase, link útil, notificação administrativa etc.).

## Classificação dos pontos de entrada

### Manter visível — operação normal

- `/admin/publicacoes` — lista e acompanhamento de acontecimentos;
- `/admin/publicacoes/novo` — única criação primária de fato datado;
- `/admin/conteudo/agenda` — calendário, consulta cronológica e presença;
- `/admin/publicacoes/[eventId]` — Ficha Única para edição, derivados, mídias, vínculos, auditoria e ações;
- `/admin/acervo` — Central do Acervo para acompanhamento, saneamento e rastreabilidade;
- `/admin/acervo/biblioteca` — Biblioteca como domínio próprio;
- `/admin/acervo/contribuicoes` — entrada de material submetido pelos Irmãos.

### Manter como cadastro mestre

- modelos de comunicação;
- frases independentes;
- links úteis;
- relações estruturadas do Acervo;
- exposições que apenas referenciam itens existentes;
- cadastros de Pessoas, Loja, Gestões e Paramaçônicas.

### Recolher em Administração avançada

- notícias sem `eventId` ou legado ainda não reconciliado;
- avisos sem `eventId` ou independentes;
- fila técnica de comunicação;
- saneamento/migração de Galeria e Arquivos;
- catalogação técnica;
- lixeira/restauração;
- deduplicação de mídia;
- métricas/diagnóstico técnico;
- notificações administrativas independentes.

### Manter somente por compatibilidade, sem botão normal

- criação direta por `/admin/acervo/publicar`;
- Galeria administrativa legada;
- Arquivos administrativos legados;
- antigas rotas de edição de Evento que já redirecionam para a Ficha;
- antiga rota isolada de migração do Acervo;
- Coleções retiradas da experiência pública.

Essas rotas não devem competir visualmente com a operação normal. Só poderão ser removidas fisicamente depois de confirmada a paridade funcional, inexistência de dependências e existência de redirecionamentos adequados.

## Correções implementadas nesta varredura

1. A navegação principal passou a usar nomes de domínio: **Central de Controle, Acontecimentos, Pessoas e Loja, Acervo e Biblioteca, Conhecimento, Cripta, Sistema e Auditoria**.
2. `Gestão de Acontecimentos` mostra somente **Acontecimentos, Registrar acontecimento, Calendário e presença** como navegação cotidiana.
3. Notícias, Avisos e Comunicação deixaram de aparecer como módulos equivalentes ao Acontecimento nas barras internas.
4. A tela principal de Acontecimentos passou a oferecer somente **Registrar acontecimento** como botão de criação primária.
5. Frases, Links e Notificações permanecem existentes, porém fora do conjunto de botões de criação do acontecimento.
6. A navegação classificada recolhe **Administração avançada** por padrão; ela abre automaticamente quando a rota técnica atual pertence ao grupo.
7. Publicação direta, Galeria legada e Arquivos legados foram retirados da navegação normal do Acervo. O saneamento passa pela **Central do Acervo**.
8. Registros do Acervo sem vínculo navegável não encaminham mais o administrador para a antiga Central de Publicação; voltam à Central do Acervo para saneamento.

## Critério para futuras telas

Antes de criar rota, botão ou formulário novo, responder:

1. Já existe entidade que representa este dado?
2. Existe uma Ficha principal para essa entidade?
3. A nova ação pode ser uma seção, drawer, diálogo ou ação contextual nessa Ficha?
4. O novo dado deve referenciar outro cadastro em vez de copiá-lo?
5. A exclusão conhece todas as dependências?
6. A função é cotidiana, cadastro mestre ou ferramenta avançada?

Se uma ação já puder ser realizada com segurança na Ficha principal, não criar novo ponto de entrada concorrente.

## Meta de experiência

O administrador deve reconhecer o Portal como um único back-office, não como um conjunto de pequenos sistemas acumulados. O histórico e as rotas técnicas continuam verificáveis, mas o fluxo cotidiano deve ser curto, previsível e orientado ao objeto real que está sendo administrado.
