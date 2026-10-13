# 19. Auditoria Administração × Portal (12/10/2026)

## Pergunta

A Administração está alinhada ao que o Portal apresenta? Dá para navegar, incluir dados e pesquisar, e fica claro o que está sendo feito?

## Método

1. Listadas todas as seções de `(member)` (o que o Irmão vê) e todas as telas de `/admin`.
2. Cruzado o registro único (`admin-tool-directory.ts`) com as rotas reais e com os cadastros que alimentam cada seção.
3. Lido o que a Central de Controle informa e como a busca funciona.

## Achados

| #   | Achado                                                                                                                                                                                                                              | Situação                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1   | Toda tela de `/admin` tem entrada no registro; o teste `admin-tool-directory.test.ts` impede órfãs. A estrutura de navegação já é sólida.                                                                                           | Ok                                                                |
| 2   | Não havia ligação entre **o que o Irmão vê** e **onde se alimenta**. Quem abria a Central de Controle via contadores de módulos, não de seções do Portal; não dava para saber o que está publicado, o que aguarda e qual tela usar. | **Corrigido** (painel "O que o Portal mostra e onde alimentar")   |
| 3   | A busca da Central encontrava só _ferramentas_ e só dentro da Central. Nenhuma busca de registros (Irmão, acontecimento, notícia) a partir de qualquer tela.                                                                        | **Corrigido** (janela Ctrl+K em toda a Administração)             |
| 4   | **Galeria de Honra** (`/irmaos/galeria-de-honra`) não tem tela, métrica ou menção na Administração; honrarias só são lançadas dentro da ficha do Irmão.                                                                             | Lacuna **sinalizada** no painel; sem tela própria ainda           |
| 5   | Parte do Portal é derivada (Início, linha do tempo, Constelação, aniversários) e nada diz isso na Administração, o que faz parecer que falta cadastro.                                                                              | **Corrigido**: cada seção traz o modo Manual / Automático / Misto |
| 6   | O bloco "Um fato, uma cadeia de memória" da Central era texto explicativo estático, sem dados.                                                                                                                                      | Substituído pelo painel com números                               |
| 7   | Ficam fora do mapa, por decisão registrada em `PORTAL_NOT_ADMIN_FED`: preferências pessoais, favoritos, endereços antigos e telas de ensaio da Cripta.                                                                              | Ok                                                                |

## O que foi entregue

- `modules/admin/lib/portal-surfaces.ts`: mapa tipado seção do Portal → tela que alimenta, modo, contagens e lacunas.
- `portal-surfaces.test.ts`: **guarda de alinhamento**. Reprova se surgir uma pasta nova em `(member)` sem entrada no mapa ou sem justificativa, se a rota pública não existir ou se a tela de alimentação não estiver em `ADMIN_TOOLS`.
- `PortalSurfacesPanel` na Central de Controle: por seção, quanto está **no Portal**, quanto **aguarda publicação**, botões **Ver no Portal** e **Alimentar**, filtro por texto e filtro "só o que precisa de atenção". Reutiliza as métricas já carregadas: nenhuma consulta nova ao banco.
- `AdminCommandPalette` (Ctrl+K / ⌘K, botão na barra superior): janela dinâmica com navegação por teclado. Acha ferramentas e seções do Portal na hora; Irmãos (nome, em todo o cadastro), Acontecimentos e Notícias (histórico, até 3.000 mais recentes de cada tipo, com cache de 1 minuto) vêm de `/api/admin/search`, filtrados pela permissão e pelo caminho administrativo de cada fonte.

## Limites conhecidos

- Contagens "No Portal" refletem as métricas da Central (ex.: notícias publicadas, avisos publicados); não medem visibilidade por perfil de acesso. Seções sem métrica confiável mostram só os botões.
- A busca de acontecimentos e notícias varre até 3.000 registros mais recentes de cada tipo (cache de 1 minuto por instância do servidor); acima disso a janela avisa que cortou. Não é um índice de texto do Firestore: cada instância nova refaz a leitura.
- Não foi possível validar visualmente em produção nem contra o Firestore real; a validação foi por tipos e testes unitários.
- Os 5 testes de `publication-center.test.ts` estavam desatualizados em relação à tela redesenhada (Painel/Lista/Calendário) e barravam o push; foram reescritos para o modelo atual de fichas por acontecimento. O cenário de "agendamento editorial" não existe mais na tela e foi trocado por um teste de separação entre futuros e realizados.

## Segunda etapa (12/10/2026)

- **Honrarias** (`/admin/pessoas/honrarias`, permissão `honor:read`): lista exatamente o que a Galeria de Honra exibe, com busca sem acento, filtros por tipo, ano e pendência (sem data, sem número do ato, sem diploma), totais e atalho "Editar na ficha" (exige `honor:manage`). Entra na Central de Controle como métrica "Honrarias na Galeria" e no painel Portal × Administração, que deixou de apontar lacuna.
- **Preenchimento automático no cadastro de acontecimento** (`suggestEventDefaults`): ao escolher o tipo e digitar o título, a tela oferece repetir local, traje, chegada sugerida, capacidade e confirmação de presença do acontecimento anterior mais parecido (mesmo título sem números > título parecido do mesmo tipo > último do mesmo tipo). Só age ao clicar em **Preencher**; traje, chegada e capacidade não sobrescrevem o que já foi digitado; data e título nunca mudam. A gestão já era preenchida pela data (`FindBoardTermForDateUseCase`). Recesso e aniversário não recebem sugestão. Usa os 300 acontecimentos mais recentes.

## Terceira etapa (12/10/2026)

- **Contagens no painel Portal × Administração** para Links úteis (ativos × inativos), Coleções e Exposições (publicadas × rascunho) e Negócios (aguardando revisão), agrupadas na Central de Controle em "Complementos do Portal". Negócios não tem contagem de aprovados, só de pendentes.
- **Busca no histórico**: acontecimentos e notícias passam a ser varridos até 3.000 registros mais recentes de cada tipo, com cache de 1 minuto por instância; a janela avisa quando corta (`record-index.ts`).
- **Rascunho do aviso a partir do acontecimento** (`buildAnnouncementDraft`): ao preparar um aviso novo na Ficha, descrição (data, hora, local, chegada, traje, presença) e expiração (dia do acontecimento, fuso de São Paulo) já vêm preenchidas e editáveis. Nada é publicado sozinho; avisos já existentes não são alterados. A notícia já recebia título, data e local do acontecimento, então não mudou.

## Quarta etapa (13/10/2026): Central simplificada

Retorno do usuário após ver o sistema: "são tantas informações e telas; precisávamos deixar mais simples e facilitado". Mudanças na Central de Controle:

- A tela abre com uma pergunta e quatro botões grandes: **Acontecimento**, **Aviso**, **Notícia** e **Foto, vídeo ou documento** (`buildQuickAdd`). Só aparece o que o perfil pode criar. Notícias e avisos ligados a um acontecimento continuam nascendo da Ficha dele.
- Uma barra de busca à vista, que abre a mesma janela do Ctrl+K.
- Em seguida, só "O que precisa de atenção" e "Próximos acontecimentos".
- O painel Portal × Administração, o panorama, as áreas, a atividade administrativa, os relatórios e o diretório de ferramentas ficaram dentro de um bloco recolhido, "Painéis, relatórios e todas as ferramentas".
- Removidos da Central o texto explicativo do cabeçalho, o bloco "Ações principais" (duplicava os botões) e os quadros de números do topo.

Verificado em ambiente local (emulador) em tela de computador e de celular (390 px).

## Próximos passos sugeridos

1. Contagem de Negócios aprovados (exige método de contagem no repositório).
2. Índice de texto de verdade (Firestore não oferece) se a Loja passar de 3.000 acontecimentos ou notícias.
3. Verificação visual em ambiente real das telas novas (Painel, Ctrl+K, Honrarias, faixa de preenchimento).

## Termos e Privacidade

Esta alteração não coleta dado novo, não envia dado a terceiros e não muda quem acessa dado pessoal: a busca devolve nome e situação de Irmãos apenas a quem já tem `member:read` e acesso a `/admin/pessoas/irmaos`; a tela de Honrarias mostra a quem tem `honor:read` os mesmos dados que a Galeria de Honra já exibe a esse perfil; o preenchimento automático e o rascunho do aviso só reaproveitam dados de acontecimentos (não pessoais). `docs/legal/` não precisou de atualização e não exige novo aceite.
