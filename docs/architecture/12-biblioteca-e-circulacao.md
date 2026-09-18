# Biblioteca e circulação

## Objetivo

A Biblioteca VL6 reúne catalogação profissional, arquivo digital, exemplares físicos, estantes,
empréstimos, avaliações e rastreabilidade. O Irmão Bibliotecário é o operador responsável pela
aprovação, entrega, devolução, localização e baixa patrimonial.

## Modelo

- `libraryItems`: registro bibliográfico, sinopse, parecer do Bibliotecário, formato, capa e métricas.
- `libraryShelves`: estantes reutilizáveis, identificadas por código e nome.
- `libraryCopies`: exemplares físicos com tombo, estado geral, situação e estante atual.
- `libraryLoans`: uma linha por exemplar solicitado; `requestPackageId` agrupa o carrinho.
- `libraryLoanEvents`: histórico imutável das decisões e movimentações.
- `libraryReviews`: nota e opinião do Irmão, uma avaliação por usuário e obra.
- `libraryInteractions`: visualizações e downloads individualizados por usuário e data.
- `libraryOccurrences`: perda, roubo, extravio ou dano, com relato e atesto do Bibliotecário.

Os índices compostos estão declarados em `firestore.indexes.json`. As gravações operacionais são
feitas no servidor; as regras do Firestore permitem ao Irmão ler somente seus empréstimos,
interações e ocorrências, enquanto a gestão integral exige `libraryItem:manage`.

## Fluxo do empréstimo

1. O Irmão adiciona até dez obras físicas ao carrinho e escolhe uma sessão futura da Loja.
2. Cada obra reserva atomicamente um exemplar disponível e integra o mesmo pacote.
3. O Bibliotecário aprova ou recusa cada item, informando prazo de retirada e devolução. Um Irmão
   com empréstimo aberto pode pedir outra obra, mas a liberação continua dependente de autorização.
4. A entrega física só é confirmada pelo Bibliotecário. Nesse momento o exemplar passa a
   `emprestado` e entra no ranking de retiradas.
5. A devolução é conferida pelo Bibliotecário e exige a seleção de uma estante ativa.
6. Reservas não retiradas até o limite são liberadas pelo job diário. Empréstimos vencidos passam a
   `atrasado` e geram aviso interno e nos canais externos habilitados (e-mail/WhatsApp).

Os estados terminais (`devolvido`, `recusado` e `cancelado`) aparecem na área arquivada de “Meus
empréstimos”; os demais permanecem em pacotes ativos.

## Baixa e ocorrências

O Irmão pode relatar ocorrência apenas sobre exemplar que retirou. O exemplar entra em manutenção
até o Bibliotecário confirmar ou rejeitar o relato. A confirmação baixa o exemplar; a rejeição
restaura a situação anterior. O Bibliotecário também pode abrir uma baixa direta, sempre com motivo,
data e relato.

## QR Code e mídia

Cada exemplar recebe uma etiqueta QR estável apontando para
`/acervo/biblioteca/exemplares/{copyId}`. A página autenticada mostra tombo, estado, situação e
estante atual sem codificar esses dados no QR; assim, transferências de estante não invalidam a
etiqueta. Capas aceitam JPG, PNG ou WEBP de até 5 MB por upload ou captura da câmera traseira do
telefone.

## Operação

- O painel administrativo oferece filas de empréstimos, estantes, etiquetas, downloads e baixas.
- O catálogo apresenta disponibilidade, formato, avaliação e Top 5 de downloads e retiradas.
- Downloads e visualizações registram usuário, obra, tipo e instante.
- O job `/api/cron/notification-daily-tasks` trata reservas vencidas e atrasos de forma idempotente.
