# Distribuição editorial pela Ficha do Acontecimento

A Ficha Única exibe nove destinos em “Onde este conteúdo será exibido?”. Os estados são derivados de Event, News, Announcement, ArchiveItem e ArchiveMedia. Nenhuma coleção paralela de publicação é criada. A publicação de notícias na ficha reutiliza a mesma ação com reconciliação do Acervo utilizada pela manutenção avançada, eliminando diferenças de efeitos entre as entradas.

| Destino                         | Fonte e controle                                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tela Inicial / Próximas Sessões | Event.exibirNaTelaInicial (ausente = true); próximas sessões/eventos por data, até três por tipo dentro da consulta da Home |
| Agenda                          | Event; edição e arquivamento existentes                                                                                     |
| Notícias                        | News.publicado; publicar/despublicar e editar destaque na ficha                                                             |
| Acervo                          | ArchiveItem.publicacaoStatus e mídias; wizard existente na ficha                                                            |
| Linha do Tempo                  | Event.exibirNaLinhaDoTempo; controle na ficha e acesso existente                                                            |
| Constelação                     | Item publicado + mídia visual publicada com mediaAssetId e acesso; seleção automática limitada                              |
| Instagram                       | Envio externo manual; links em News.instagramUrls são evidência registrada, sem verificação remota                          |
| Comunicação interna             | Announcement.publicado e expiração; avisos e notificações existentes                                                        |

O controle do Início afeta somente a vitrine do acontecimento. Notícias e avisos relacionados continuam seguindo suas fontes, destaques e limites próprios; ocultar o acontecimento não despublica derivados.

A ação de distribuição exige event:read e event:update, valida tenant/deletedAt em transação e altera somente os dois campos de exibição. A mesma transação registra antes/depois em auditLogs. As visões dependentes são revalidadas.

A edição comum dos dados preserva nível de acesso e escolha da Linha do Tempo. Rotas antigas de notícias/avisos vinculados conduzem à ficha quando o editor possui event:read e o acontecimento está ativo; manutenção avançada explícita usa manutencao=1. Registros independentes e órfãos permanecem editáveis.

Elegibilidade não é promessa de presença na tela: respeita público, filtros, paginação e limites. Falhas de leitura ou falta de permissão mostram “Não foi possível verificar”, nunca ausência ou publicação presumidas.

Revisão de docs/legal: sem novo dado pessoal, público autorizado, finalidade, terceiro, retenção ou integração externa. Os controles reorganizam a exibição dentro das superfícies existentes; Instagram continua manual. Não exige nova versão dos termos ou aceite.
