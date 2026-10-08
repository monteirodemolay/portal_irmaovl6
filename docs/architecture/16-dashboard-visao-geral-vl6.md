# Visão geral administrativa VL6

Referência aprovada: mock-up `vl6-visao-geral-portal`, com panorama institucional, módulos, cobertura de acesso, filas de trabalho, agenda, movimentação e relatórios na mesma página `/admin`.

## Fontes e semântica

- Pessoas: `member.search`, todas as páginas até 5.000 membros. Excluídos são removidos pelo repositório. Ativos usam situação maçônica `ativo`.
- Contas: `user.listByTenant`, mesma fonte do contador anterior. Conta total não equivale a membro vinculado. Cobertura exige usuário ativo, não excluído, mesmo tenant e `user.memberId === member.id`, além de `member.userId === user.id`; denominador são membros ativos.
- Perfis: `publicationSettings.countPublishedByTenant`. Configurações publicadas não suspensas; não é etapa do funil de acesso, nem percentual sobre os ativos.
- Publicações: notícias não excluídas, paginadas até 5.000. Publicado e rascunho separados. Avisos publicados e acontecimentos futuros usam os repositórios atuais. Não reconstruir histórico editorial a partir do estado atual.
- Acervo: `countByTenant` e `countPublishedByTenant` são unidades de itens. Documentos FileAsset e álbuns GalleryAlbum são apresentados como fontes legadas separadas. Sem somar referências ou eventos como arquivos/álbuns equivalentes. Relatórios especializados continuam no diretório.
- Biblioteca: obras são itens, não exemplares. Empréstimos em aberto: retirado/atrasado, não excluído e não devolvido. Vencimento exige `dueAtConfirmed === true` e `dueAt < atualização`.
- Conhecimento: status de publicação `publicado`; cursos não excluídos. Progresso e tentativas são vinculados à versão atual de curso existente. Participantes são usuários distintos; conclusões são registros de progresso. Sem matrícula obrigatória.
- Filas: grupos de duplicados, contribuições, comentários, links, empréstimos e tentativas em revisão são categorias independentes; não somar como pessoas. Moderadores exclusivos visualizam suas tarefas.
- Gestão e operação: links autorizados para termos, integrações e Cripta. Fontes não consolidadas aparecem como tal; nenhum contador fictício de execução ou aceite. Cripta não fornece cartas, destinatários ou anexos.

## Movimentação e cobertura

`auditLogs` é consultado pelo tenant, `timestamp >= início` e `< dia seguinte ao fim`, em America/Sao_Paulo. Período máximo de um ano; padrão do início do mês até hoje. Usa o índice existente tenant/timestamp. Projeção: timestamp, ação, entidade, ID e usuário; não transfere valorAnterior, valorNovo, IP ou dispositivo.

Limite de segurança: 2.001 documentos para detectar cobertura parcial, exibindo no máximo 2.000. Ao atingir o limite, gráficos, tabela e exportações avisam que é amostra e orientam reduzir o período. Não apresentar esse resultado como total histórico. Somente entidades com rótulo público conhecido entram na visão geral; dados privados da Cripta e entidades desconhecidas são excluídos. Os nomes dos atores são resolvidos com verificação de tenant.

Criações, atualizações, exclusões e restaurações são eventos distintos. Ações adicionais aparecem no histórico; os quatro gráficos não representam toda a atividade. A auditoria não mede acessos ou engajamento, e não prova cobertura das operações que não geram registros. A diferença de campos anteriores/depois deve ser consultada na ferramenta autorizada de auditoria; não é reproduzida indiscriminadamente no Dashboard.

## Relatórios e autorização

`GET /api/admin/dashboard/report` suporta CSV e PDF real, pelo renderer já instalado. Reexecuta as fontes no servidor, verifica sessão, acesso administrativo, permissão granular e restrição por caminho. Não recebe contadores do navegador e não utiliza cache compartilhado entre usuários/tenants. Respostas `private, no-store`, downloads com nome baseado no intervalo e CSV protegido contra fórmulas.

Relatório contém filtros e fuso, atualização, panorama atual, regras dos indicadores, pendências atuais e histórico do período; cobertura parcial/falha/ausência de autorização distintas de zero. Ações selecionadas filtram somente o histórico. Não é uma prestação de contas financeira nem relatório de estoque histórico. A atualização pode diferir da tela, pois a exportação consulta novamente.

## Experiência e limites

Página responsiva, módulos expansíveis, composição vinculada às ferramentas reais, tabela de auditoria paginada em lotes de 20. Dicas opcionais podem ser dispensadas localmente enquanto a página estiver aberta; pendências não possuem esse botão. Nenhum lembrete é enviado pelo Dashboard. Prazos de moderação não são inventados.

Consultas independentes falham separadamente. Resultados desconhecidos aparecem como indisponíveis; zero é exibido somente após consulta bem-sucedida. Limite/paginação incompleta de membros ou notícias torna a respectiva fonte indisponível, em vez de mostrar uma contagem truncada.

Gestão/ano por módulo, agregações históricas completas para grandes volumes, snapshots de estoque, bytes físicos deduplicados e telemetria de integrações permanecem extensões futuras; não aparecem como filtros sem suporte. A Área do Irmão não é alterada.

## Validação

Testes de datas/fuso, paginação, exclusão/restauração, CSV seguro, vínculos/tenant, papel restrito, moderador exclusivo, falha parcial, prazo confirmado, versões do Conhecimento, expansão/dispensa de dicas, filtros nas exportações e geração de bytes PDF. Fluxos de produção, notificações, exclusões e Cripta não são operados como teste.

Workflow de PR executa type-check, testes direcionados e build. Revisão visual no preview autenticado deve comparar esta implementação com a referência aprovada antes de merge/publicação.
