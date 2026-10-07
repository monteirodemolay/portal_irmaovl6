# Central de Administração VL6

Base: branch `claude/portal-irmao-vl6-co6uvq`, commit `d80e5fdfce23474600d0c3f7d387664c24b12555`. Implementação orientada pelo mock-up aprovado em 07/10/2026.

## Estrutura

`/admin` é a entrada de trabalho da Loja, com sete áreas e retorno explícito ao Portal. A sidebar administrativa não repete a navegação do Irmão. A Plataforma continua separada. O painel existente conserva suas consultas e indicadores; o diretório de ferramentas adiciona busca apenas sobre nomes de ferramentas autorizadas, sem indexar registros privados.

- Visão geral: `/admin`.
- Publicações e Agenda: `/admin/publicacoes`; listas e formulários existentes em `/admin/conteudo`, `/admin/comunicacao` e `/admin/acervo/publicar`.
- Pessoas e Loja: `/admin/pessoas`.
- Acervo e Biblioteca: `/admin/acervo`.
- Conhecimento: `/admin/conhecimento`.
- Cripta: `/admin/cripta`; Projetor em `/admin/cripta/projetor`.
- Configurações e Auditoria: `/admin/configuracoes`; ferramentas de manutenção em `/admin/configuracoes/manutencao`.

A experiência pública do Acervo, Biblioteca, Constelação e Conhecimento permanece nas mesmas rotas. O catálogo bibliográfico não é duplicado. Nenhuma coleção foi migrada e nenhuma regra de acesso por grau ou servidor foi substituída.

## Publicações

A lista e o calendário usam os casos de uso existentes, filtrados por permissão antes da consulta. O Acervo é consultado por `tenantId` da sessão. Falhas de uma fonte aparecem individualmente, sem transformar falha em lista vazia bem-sucedida. A consulta inicial limita notícias, eventos e itens do Acervo a 100 registros por fonte; a tela informa esse limite funcional e aponta às telas específicas para o histórico completo.

A opção “Publicação completa” abre `/admin/publicacoes/novo`: o formulário completo de evento cria o acontecimento uma única vez e continua em `/admin/publicacoes/[eventId]`. Essa página reúne edição do evento, notícias, avisos, organizador do Acervo e artes. Os painéis usam âncoras e permanecem montados, preservando o texto enquanto o administrador alterna de tarefa. Os salvamentos retornam estado e revalidam a página, sem redirecionar aos módulos separados.

Os formulários e casos de uso originais são reutilizados. Notícias e avisos existentes sem vínculo podem ser associados, conservando seus IDs e campos. Avisos passam a ter `eventId` opcional: nenhuma migração ou associação por título é executada; edições antigas preservam o vínculo. Ações validam permissões, tenant da sessão, existência do evento e correspondência do conteúdo antes de alterar ou publicar. Não transferem silenciosamente conteúdo associado a outro evento.

O wizard do Acervo aceita o evento e o lote já selecionados, pula a seleção do evento e conserva upload, classificação, organização, capa, revisão, publicação imediata, agendamento e registro de Instagram. Ao concluir no espaço único, atualiza os dados e retoma o mesmo evento/lote. Fotografias publicadas de acesso não administrativo podem ser escolhidas para a galeria da notícia por referência ao proxy de mídia, sem upload ou duplicação. Novos arquivos precisam ser publicados no painel de mídia antes de serem reutilizados dessa forma.

Moderação de comentários, links externos da notícia e alcance do aviso são incorporados. A geração de arte reutiliza os dados do acontecimento e o caso de uso idempotente existente. Aprovação, geração dos arquivos e registro de distribuição continuam no componente original de comunicação. As rotas especializadas são preservadas, inclusive exclusão e históricos. Conteúdos avulsos continuam disponíveis.

Publicações são operações independentes com as permissões e notificações existentes. Não há transação atômica entre evento, notícia, aviso, acervo e comunicação, nem envio automático a redes externas. O evento aparece na agenda ao ser cadastrado; notícias e avisos nascem em rascunho. Falha ao concluir publicação não anuncia sucesso: a página revalida para mostrar o estado realmente persistido. O calendário distingue data do acontecimento, publicação realizada e planejamento editorial.

## Compatibilidade da Cripta

Os componentes originais foram movidos, preservando ações, APIs, confirmação, estado, exportação, restauração, comissão e cerimônias. Endereços `/cripta-administracao/*` e `/cripta-projetor` redirecionam para os destinos canônicos, preservando parâmetros de consulta e exigindo `tenant:manage`. As notificações antigas continuam válidas pelo redirecionamento. `Zerar tudo` permanece com suas confirmações, isolado em `/admin/cripta/manutencao`.

## Autorização

Os gates de páginas, ações e APIs continuam ativos. O Bibliotecário mantém somente os prefixos administrativos existentes: Acervo e Configurações, além da raiz exata `/admin`. Não ganha acesso à central editorial, Pessoas, Conhecimento ou Cripta. Papéis personalizados continuam dependentes das permissões específicas. O diretório e as abas filtram destinos; esse filtro não substitui autorização no servidor.

## Reversão e validação

A alteração é reversível por revert do commit, sem rollback de dados. Antes de integrar: verificar RBAC de Bibliotecário e papéis personalizados, navegação móvel, criação/edição de cada conteúdo, redirecionamentos legados da Cripta e operações de cerimônia em ambiente de teste. Não operar reset ou cerimônia em dados reais para validar navegação. A publicação em produção segue a autorização explícita do usuário e os checks de código/build; a inspeção autenticada deve ser registrada separadamente quando não estiver disponível.

## Verificações

A central inicial foi publicada em produção pelo PR #209; o build remoto foi concluído na Vercel com as otimizações de memória do Next.js. Essas opções são preservadas. O build local com envio ao Sentry não foi repetido após bloqueio da revisão automática.

A correção do fluxo único é coberta por testes de vínculo, preservação de campos, permissões, isolamento de tenant, falha parcial de publicação, retomada do mesmo evento/lote e seleção de fotografia existente sem novo upload. TypeScript, lint e o build remoto fazem parte da liberação. Navegação autenticada e inspeção visual desktop/móvel precisam de sessão de teste e não são presumidas a partir desses checks.
