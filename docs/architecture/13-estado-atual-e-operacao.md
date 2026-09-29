# 13. Estado implementado e mapa de evolução — 28/09/2026

> **Escopo:** inventário arquitetural baseado nas rotas, componentes, entidades, casos de uso, scripts e configurações presentes na branch `claude/portal-irmao-vl6-co6uvq` em 28/09/2026. **Código existente não equivale a validação integral em produção.** Documentos 01–12 registram decisões históricas e aprofundamentos; quando o texto deles divergir de uma implementação mais recente, confirmar a realidade no código antes de reutilizá-los como instrução operacional.

## 13.1 Vista da solução

```text
Navegador (Next.js 15 / React 19 / área autenticada)
    ├── /agenda, /noticias, /acervo, /irmaos, /paramaconicas
    ├── /cripta (acesso piloto) e /cripta-administracao
    └── /admin e /plataforma (acessos RBAC)
         │
         ▼
Server Components + Server Actions + Route Handlers (/api/*)
         │
         ├── packages/domain: entidades, portas, casos de uso
         ├── packages/infra: repositórios Firestore, Firebase Admin,
         │                   gateways de armazenamento/Google
         ├── packages/shared: schemas, enums e regras puras
         └── packages/ui: componentes e identidade visual
                   │
           ┌───────┼───────────────────────┐
           ▼       ▼                       ▼
      Firebase  Vercel Blob         Serviços integrados
      Auth +    (mídia geral)       Google Calendar OAuth;
      Firestore                     Wix privado (piloto Cripta)
```

- Modelo multi-tenant: documentos com `tenantId`, resolução pelo contexto da requisição, regras de permissão nos casos de uso/rotas e regras Firestore. **Não presumir** que uma tela autenticada autoriza leitura de qualquer coleção.
- Site institucional público `www.vl6.com.br`: origem externa em Wix, não deve ser confundido com o Portal autenticado `portal.vl6.com.br`.
- A aplicação usa Vercel para o Next.js, suas funções e tarefas agendadas; `apps/web/vercel.json` configura seis rotas de cron. A ausência de Firebase Cloud Functions **não implica** que o projeto Firebase esteja no plano Spark: a instância operacional de `portalvl6` foi identificada no plano Blaze em 28/09/2026.
- Credenciais administrativas: servidor via Firebase Admin SDK (`packages/infra/src/firebase/admin-app.ts`); nunca enviar `FIREBASE_PRIVATE_KEY`, `FIREBASE_PRIVATE_KEY_BASE64` ou arquivos de conta de serviço ao Git, à documentação ou ao cliente.

## 13.2 Componentes em funcionamento de código

| Área                                | Entradas e implementação verificáveis                                                                                                                              | Limites/observações                                                                                                                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidade e Diretório              | `/reivindicar`, `/irmaos`, `/irmaos/meu-espaco`, administração de membros/papéis; Firebase Auth, RBAC e dados de membro                                            | A autorização precisa ser reavaliada para cada acesso a dados.                                                                                                                                             |
| Agenda unificada                    | `/agenda`, `my-agenda-view.tsx`, `calendar-item.ts`, `event-form.tsx`; sessões, eventos, aniversários, paramaçônicas, recessos, entradas pessoais e Google         | Ano civil como janela padrão; em dezembro inclui janeiro seguinte. Recesso usa intervalo de datas; sincronização Google sob OAuth é condicionada e limitada por tempo, não gratuita em termos de chamadas. |
| Notícias                            | `/noticias`, `/noticias/todas`, `/[slug]`; destaque editorial, pesquisa, filtros por ano/categoria e paginação; administração e importação de URLs de `vl6.com.br` | Importação/reimportação e vínculo `News.eventId` precisam de revisão de resultado por administradores.                                                                                                     |
| Acervo                              | `/acervo` e rotas de eventos, pessoas, gestões, coleções, fotografias, audiovisual, documentos, exposições, contribuições, catalogação e linha do tempo            | Convivência deliberada entre objetos do Acervo unificado e módulos legados. Ver doc 11.                                                                                                                    |
| Constelação VL6                     | `/acervo/constelacao`, `loadConstellationMemories` e `MemoryConstellation`                                                                                         | Experiência automática; filtra eventos com **foto ou vídeo** publicado, não excluído e acessível, com ID de mídia; não mostra documento/áudio isolado como lembrança.                                      |
| Biblioteca                          | `/acervo/biblioteca` e operações administrativas de exemplares, QR/tombo, estantes, reservas/empréstimos, avaliações e baixas                                      | Ver `12-biblioteca-e-circulacao.md`; regras patrimoniais próprias.                                                                                                                                         |
| Comunidade Paramaçônica             | `/paramaconicas` e papéis com exposição reduzida de informações                                                                                                    | Acesso da comunidade não equivale ao acesso de um Irmão da Loja; ver `12-comunidade-paramaconica.md`.                                                                                                      |
| Comunicação / Avisos / Notificações | `/admin/comunicacao`, rotas de tarefas diárias, notícias e avisos                                                                                                  | Crons operacionais requerem `CRON_SECRET` e implantação configurada.                                                                                                                                       |
| Termos e privacidade                | entidades `LegalDocumentVersion` e `LegalDocumentAcceptance`; administração e aceite de versões                                                                    | Publicação pelo painel pode exigir novo aceite e notificar; solicitações LGPD completas ainda dependem de fluxo institucional. Ver `docs/legal/04-sistema-de-versionamento.md`.                            |
| Cripta                              | `/cripta`, `/cripta-administracao`, `/cripta-laboratorio`, `/cripta-demonstracao`; rascunhos, envelopes, mídia otimizada e integração Wix                          | **Piloto restrito; não interpretar como custódia anual pronta.** As três cópias externas, a recuperação institucional e os ensaios finais continuam pendentes. Ver documentos da Cripta.                   |

## 13.3 Acervo, Notícias e Constelação

O Acervo tem modelo próprio: `ArchiveItem` (registro editorial e vínculos), `ArchiveMedia` (participação da mídia em um item) e `MediaAsset` (metadados do binário), com vínculo opcional do item a `Event`/`BoardTerm`. `ArchiveMedia.pessoasIdentificadas` guarda IDs já vinculados, não implica identificação facial automática confirmada. Coleções e relações editoriais próprias não autorizam duplicar um evento existente.

**Notícia → Evento → Acervo:** `syncNewsMediaToArchive` reaproveita o evento, busca item canônico do evento quando possível, registra origem da notícia nas mídias, lida com mudança de vínculo e deduplicação. A data histórica do evento e a data editorial da notícia permanecem distintas. Importação de mídia depende de formatos e origem aceitos; não prometer aproveitamento de todo link sem revisão.

**Constelação:** `loadConstellationMemories` agrupa `Event` + `ArchiveItem` + `ArchiveMedia` + `BoardTerm` apenas quando a publicação e a visibilidade forem válidas. A função `isConstellationVisualMedia` exige `mediaType` foto/vídeo, status publicado, não exclusão e referência a binário. Experiência em `MemoryConstellation`: ano, lembrança aleatória equilibrada por período, alternância automática, vídeo com controles, altura visual previsível. Há limites explícitos de consulta/retorno (`MAX_EVENTS=3000`, `MAX_ITEMS=5000`, `MAX_MEDIA=10000`, `MAX_MEMORIES_RETURNED=160`, `MAX_VISUAL_MEDIA_PER_MEMORY=18`); eles **não representam cobertura ilimitada de todo o acervo**. O proxy `/api/archive-media/[id]?track=0` evita contabilizar visualização durante slideshow, mas o arquivo continua protegido pela autenticação.

**Vitrine principal do Acervo:** `/acervo` mantém `Memória em evidência` em moldura responsiva com altura estável e corte visual controlado. Imagens/textos não devem definir livremente a altura dos destaques.

**Reconhecimento facial:** há projeto de reconhecimento local/assistido registrado no doc 11; não caracterizar como reconhecimento automaticamente implantado e validado sem comprovação no código e testes.

## 13.4 Agenda e nomenclatura do Templo

- `Event` é a fonte primária das sessões e eventos da Loja. `/agenda` agrega fontes institucionais, pessoais e externas sob permissões próprias; os filtros não modificam a origem.
- `syncGoogleCalendarIfStaleAction` evita nova sincronização quando a última foi há menos de cinco minutos ou já existe sincronização ativa. Isso reduz chamadas desnecessárias, **não elimina as dependências do Google**.
- `normalizeEventLocation`, em `packages/shared/src/agenda/normalize-event-location.ts`, converte os valores antigos exatos `Templo da Verdadeira Luz` e `A confirmar` (aceita variações de espaço/maiúsculas) para **`Templo da Verdadeira Luz - Ivan Damasceno`**, sem modificar outros locais. `FirestoreEventRepository` aplica o normalizador na leitura e em futuras gravações; formulários sugerem o local oficial.
- Migração histórica: `scripts/normalize-temple-location.ts` exige `TENANT_ID` e credenciais administrativas; execução padrão é **DRY_RUN** e `--apply` grava no Firestore. Registro operacional de 28/09/2026: **81 documentos verificados, 61 alterados e 0 candidatos no DRY_RUN posterior**, no tenant da VL6. Esses números são uma execução histórica, não uma métrica permanente.
- Depois da operação, o arquivo temporário da chave deve ser apagado e sua chave revogada. Não guardar chaves em docs, exemplos ou commits.

## 13.5 Cripta: distinguir protótipo, piloto e guarda anual

Há código funcional para a experiência pessoal de carta e mídias, rascunho e integração com armazenamento privado Wix. O fluxo online restringe acesso ao piloto/conta e a membros ativos; a API de cartas tem limite máximo de cinco cartas concluídas, 2,5 MB somados em anexos e 3,6 MB por requisição JSON. Otimizações no navegador estão sujeitas aos codecs disponíveis e podem reduzir qualidade.

**Não anunciar guarda institucional plena:** não existem evidências de todas as cerimônias, três cópias externas verificadas/restauráveis, recuperação de chaves, exclusões sincronizadas e ensaios finais em produção. A flag `CRIPTA_REAL_CONTENT_ENABLED` em `operation-policy.ts` protege o modelo de janela formal; há fluxos online de piloto separados, que não são equivalentes à liberação da custódia anual. Ver `cripta-especificacao-funcional.md`, `cripta-operacao-real.md` e `cripta-manual-operacional.md` para divergências conhecidas e critérios de lançamento.

## 13.6 Operação, segurança e verificações

| Tema             | Regra prática                                                                                                                                                        |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fonte da verdade | O código versionado, o estado real do Firestore e os workflows de deploy; textos históricos podem representar uma fase anterior.                                     |
| CI               | `.github/workflows/validate-portal.yml` — instalação, type-check e build; executar também testes específicos quando mudar regras de domínio.                         |
| Produção         | Vercel, branch configurada para o projeto; distinguir `READY` de preview, `READY` em produção e validação visual autenticada após o deploy.                          |
| Banco            | Scripts retroativos devem delimitar tenant, ser idempotentes, começar com simulação e não extrapolar os campos previstos.                                            |
| Dados pessoais   | Consentimento/aceite e RBAC por rota não dispensam minimização, proteção de logs e tratamento das solicitações LGPD.                                                 |
| Integrações      | Firebase Auth/Firestore, Google Calendar, Vercel Blob e Wix têm credenciais e limites independentes. Não reutilizar indiscriminadamente credenciais administrativas. |
| Documentação     | Atualizar README (visão executiva), índice (navegação), doc especializado (regras) e este inventário (status), sempre no mesmo PR da mudança arquitetural.           |

## 13.7 Itens que permanecem para validação/aperfeiçoamento

1. Ensaios ponta a ponta autenticados de apresentação, responsividade, importação, vídeo e permissões em diferentes dispositivos.
2. Verificação de cobertura de todas as mídias e escala do Acervo para além dos limites atuais de carregamento; custo de consultas e paginação no servidor.
3. Revisão das rotinas de sincronização e resiliência do Google Calendar; integração não deve ser apresentada como offline ou isenta de chamadas.
4. Testes e governança da identificação de pessoas, inclusive controles de acesso/consentimento.
5. Operação institucional completa da Cripta, chaves e unidades externas, antes de habilitação real.
6. Fluxo institucional de solicitações de titulares previsto nos documentos LGPD.
7. Manter as descrições antigas da documentação arquivadas como evolução histórica, mas não confundi-las com garantias da implantação atual.
