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

O botão Criar leva ao formulário próprio de cada tipo, mantendo os campos específicos, revisão e efeitos da operação existente. As notícias usam `eventId`; artes usam `sourceId`; itens do Acervo usam `eventId`. O resumo não cria relacionamentos novos nem copia os acontecimentos. Os avisos continuam sem `eventId` nesta etapa.

O calendário distingue acontecimento, publicação realizada e planejamento editorial. Artes publicadas são distribuição registrada manualmente; `scheduledFor` é planejamento e não uma integração automática. Nenhum envio ao Wix, Instagram ou WhatsApp foi adicionado. O Acervo conserva seu checklist, classificação e publicação própria.

O fluxo transacional único demonstrado no protótipo não substitui os formulários reais nesta entrega. Publicações em lote, vínculo estrutural aviso–evento e repetição de uma transação envolvendo múltiplos serviços precisam de implementação de domínio específica; não são simulados na aplicação operacional.

## Compatibilidade da Cripta

Os componentes originais foram movidos, preservando ações, APIs, confirmação, estado, exportação, restauração, comissão e cerimônias. Endereços `/cripta-administracao/*` e `/cripta-projetor` redirecionam para os destinos canônicos, preservando parâmetros de consulta e exigindo `tenant:manage`. As notificações antigas continuam válidas pelo redirecionamento. `Zerar tudo` permanece com suas confirmações, isolado em `/admin/cripta/manutencao`.

## Autorização

Os gates de páginas, ações e APIs continuam ativos. O Bibliotecário mantém somente os prefixos administrativos existentes: Acervo e Configurações, além da raiz exata `/admin`. Não ganha acesso à central editorial, Pessoas, Conhecimento ou Cripta. Papéis personalizados continuam dependentes das permissões específicas. O diretório e as abas filtram destinos; esse filtro não substitui autorização no servidor.

## Reversão e validação

A alteração é reversível por revert do commit, sem rollback de dados. Antes de integrar: verificar RBAC de Bibliotecário e papéis personalizados, navegação móvel, criação/edição de cada conteúdo, redirecionamentos legados da Cripta e operações de cerimônia em ambiente de teste. Não operar reset ou cerimônia em dados reais para validar navegação. Não realizar publicação em produção antes da revisão da interface real.

## Verificações desta entrega

- TypeScript do web: aprovado.
- ESLint dos componentes, rotas e testes alterados: aprovado.
- 14 testes direcionados de acesso, API de guardiões e interação editorial: aprovados.
- 64 destinos estáticos do diretório: nenhuma rota ausente; formulários e detalhes dinâmicos permanecem acessíveis por suas listagens.
- 25 arquivos retirados dos caminhos antigos: todos realocados para a Cripta administrativa.
- Build completo: bloqueado pela revisão automática devido ao envio ao endpoint externo do Sentry, sem conteúdo da transmissão estabelecido. Não há confirmação de build completo.
- Navegação real autenticada e inspeção visual desktop/móvel: pendentes, navegador de testes indisponível neste ambiente.
