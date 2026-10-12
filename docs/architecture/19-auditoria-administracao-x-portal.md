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
- `AdminCommandPalette` (Ctrl+K / ⌘K, botão na barra superior): janela dinâmica com navegação por teclado. Acha ferramentas e seções do Portal na hora; Irmãos (nome, em todo o cadastro), Acontecimentos e Notícias (entre os 100 mais recentes) vêm de `/api/admin/search`, filtrados pela permissão e pelo caminho administrativo de cada fonte.

## Limites conhecidos

- Contagens "No Portal" refletem as métricas da Central (ex.: notícias publicadas, avisos publicados); não medem visibilidade por perfil de acesso. Seções sem métrica confiável mostram só os botões.
- A busca de acontecimentos e notícias olha os 100 mais recentes, não o histórico completo. Busca completa exige índice próprio.
- Não foi possível validar visualmente em produção nem contra o Firestore real; a validação foi por tipos e testes unitários.
- Os 5 testes de `publication-center.test.ts` já falhavam antes desta tarefa.

## Próximos passos sugeridos

1. Tela de Honrarias (lista de todas, com filtro por tipo e homenageado), para fechar a lacuna nº 4.
2. Métricas "no Portal" para Negócios, Links, Exposições e Coleções.
3. Índice de busca para o histórico completo de acontecimentos e notícias.
4. Rotinas de preenchimento automático: sugerir local, gestão e tipo a partir do último acontecimento semelhante.

## Termos e Privacidade

Esta alteração não coleta dado novo, não envia dado a terceiros e não muda quem acessa dado pessoal: a busca devolve nome e situação de Irmãos apenas a quem já tem `member:read` e acesso a `/admin/pessoas/irmaos`. `docs/legal/` não precisou de atualização e não exige novo aceite.
