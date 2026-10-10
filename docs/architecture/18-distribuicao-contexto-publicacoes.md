# Distribuição e contexto das publicações

## Regra central

O Administrador registra o fato uma vez. O Portal distribui o mesmo conteúdo para as superfícies correspondentes, conforme tipo, data, status e vínculo.

Não existe uma segunda publicação apenas para “aparecer na Tela inicial”. A Tela inicial é uma visão derivada dos registros canônicos.

## Matriz de distribuição

| Origem canônica | Condição | Onde aparece |
| --- | --- | --- |
| Acontecimento · Sessão | Data futura | Agenda; entre as Sessões futuras, as 3 mais próximas alimentam a Tela inicial: 1 destaque em “Próxima Sessão” + 2 em “Próximas Sessões” |
| Acontecimento · outro tipo | Data futura | Agenda; entre os Eventos futuros, os 3 mais próximos alimentam a Tela inicial: 1 destaque em “Próximo Evento” + 2 em “Próximos Eventos” |
| Acontecimento | Data passada e `exibirNaLinhaDoTempo !== false` | Linha do Tempo; permanece como fato histórico mesmo sem mídia |
| Notícia | Publicada | Página Notícias; as 3 notícias publicadas mais recentes são elegíveis ao módulo “Acontece na Verdadeira Luz” da Tela inicial |
| Aviso | Publicado e ativo/no prazo | Bloco de Avisos da Tela inicial e área de Avisos |
| Arte/comunicação | Distribuição registrada | Registro de comunicação externa na Ficha; não vira automaticamente notícia, aviso ou destaque da Tela inicial |
| Memória/Acervo | Conteúdo publicado | Acervo VL6; acontecimento sem conteúdo não gera álbum vazio |
| Memória visual publicada | Memória publicada e mídia visual elegível | Pode alimentar a Constelação conforme as regras do Acervo |

## Ficha Única

A Ficha deve responder duas perguntas distintas:

1. **O que existe neste acontecimento?** — dados, notícia, aviso, fotos, vídeos, documentos, pessoas, links, comunicação e memória.
2. **Onde isso aparece?** — Agenda, Tela inicial, Notícias, Avisos, Linha do Tempo, Acervo, Constelação ou apenas registro administrativo.

As duas informações devem ser apresentadas juntas, sem exigir que o Administrador conheça as rotas internas do sistema.

## Tela inicial

A Tela inicial não é uma origem editorial. Ela é composta automaticamente a partir de:

- próxima Sessão e duas Sessões seguintes;
- próximo Evento e dois Eventos seguintes;
- Avisos ativos;
- notificações pessoais;
- até três Notícias publicadas recentes;
- aniversariantes, memória “Neste dia”, gestão e demais módulos próprios;
- entrada/resumo do Acervo.

Assim, alterar a data ou o status na origem reflete naturalmente no contexto correspondente.

## Exceções

Conteúdos independentes continuam permitidos quando realmente não pertencem a um Acontecimento. Eles devem ser identificados explicitamente como independentes e mostrar seu destino, para não concorrer visualmente com o fluxo canônico.

## Princípio de UX

**Cadastrar uma vez. Relacionar sempre. Editar na origem. Mostrar o destino. Refletir nas visões dependentes.**
