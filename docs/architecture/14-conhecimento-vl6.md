# Conhecimento VL6 — implantação aditiva

## Limites

Somente o Conhecimento é criado. Não altera páginas, coleções, catálogo, empréstimos, tombos, arquivos ou permissões do Acervo e da Biblioteca. A seção existente do menu recebe Conhecimento VL6 e Gestão do Conhecimento. Leituras recomendadas guardam `libraryItemIds` e abrem `/acervo/biblioteca/{id}`. A disponibilidade e o acesso digital continuam sob as regras atuais da Biblioteca. A restrição por grau da formação não muda a visibilidade original dos livros já catalogados.

## Rotas e visual

`/conhecimento`: painel pessoal e retomada; `/formacoes`: pesquisa e categorias; `/minha-jornada`: trilhas; `/rapido`: conteúdos até 10 minutos; `/atividades`: pendências; `/progresso`: histórico privado; `/formacao/{id}`: módulos e leituras; `/aula/{id}/{lessonId}`: vídeo, PDF, imagem, texto, link, atividade ou avaliação; `/resultado/{id}/{lessonId}`: retorno; `/certificado/{id}`: certificado para impressão/PDF.

`/admin/conhecimento`: gestão; `/novo` e `/editar/{id}`: editor com informações, módulos e aulas, atividades, avaliação, público e revisão/publicação; `/revisoes`: correção humana; `/relatorios` e `/relatorios/{uid}`: acompanhamento autorizado; `/api/conhecimento/relatorio`: CSV com proteção contra fórmulas em células.

O AppShell e PageHero do Portal são reutilizados. A superfície do Conhecimento mantém azul-marinho, dourado, cards discretos e navegação responsiva do mock-up. Não instala outro sistema EAD nem cria cadastro paralelo.

## Permissões e grau

Todos os Irmãos com cadastro não excluído, ativo tecnicamente (`ativo=true`) e sessão válida podem estudar. Usuários sem vínculo de Member não acessam. O grau é relido do cadastro no servidor; não vem de formulário, URL ou storage do navegador.

A Administração escolhe `audienceMode=minimum` (Aprendiz/Companheiro/Mestre e superiores) ou `selected` (somente os graus explicitamente escolhidos). Não se trata de autorização para conteúdos ritualísticos reservados, que não devem ser publicados neste módulo. Mestre Instalado é título, não um quarto valor do campo `Member.grau`; esta versão usa os três graus efetivamente existentes no cadastro.

A gestão exige `knowledge:manage` ou `tenant:manage`. A chave nova é delegável por papéis customizados na Administração existente; bibliotecário não recebe gestão do Conhecimento automaticamente. O acesso pessoal não depende de atualizar claims de todos os membros: a matrícula existente é verificada no servidor. O seed inclui `knowledge:read` para membro/bibliotecário e `knowledge:manage` para administrador. A sincronização dos papéis existentes utiliza o procedimento já disponível no Portal.

As regras de Member impedem que o titular altere grau, vínculo de conta, Loja, situação ou marcadores de ativação/exclusão via SDK client. Administradores com a permissão de alteração conservam o fluxo institucional de atualização.

## Firestore

- `knowledgeCourses`: BaseEntity, conteúdo, versão, revisor e publicação. Módulos/aulas/questões pertencem à formação. Limites validados de 650 KB e 200 aulas por formação.
- `knowledgeVersions`: snapshots imutáveis de cada salvamento, registrados atomicamente com a formação e o auditLog.
- `knowledgeProgress`: um documento por tenant/uid/formação, ID SHA-256 da tripla; versão estudada, aulas concluídas, última aula, posições, contagens de tentativas e resumos da última tentativa por atividade; conclusão e código de certificado.
- `knowledgeAttempts`: respostas completas em documentos próprios, evitando crescimento ilimitado do documento de progresso. Nota calculada pelo servidor; reflexões/situações exigem análise humana. Tentativas e atualização do progresso gravadas na mesma transação.
- `knowledgeAssets`: metadados do arquivo privado e ligação à formação. Sem URLs públicas de vídeo ou PDF no DTO pessoal.

SDK client não lê ou escreve nenhuma dessas coleções. Server Actions usam Admin SDK com verificação explícita de tenant, usuário, grau, status, período e versão. O servidor remove gabarito, resposta esperada e feedback das questões antes de entregá-las ao Irmão. Progresso individual somente do titular; relatórios e respostas somente para gestor autorizado da Loja.

Índices novos são aditivos em `firestore.indexes.json`. Nenhuma migração de dados do Acervo/Biblioteca.

## Publicação e protocolos

Rascunho → Em revisão → Publicado → Arquivado. Publicação exige etapa de revisão, módulos/aulas válidos, arquivos anexados e vínculos existentes na Biblioteca da mesma Loja. Autor, revisor, versão e alterações ficam registrados. Quem possui a gestão pode revisar e publicar; não há obrigação técnica de revisores distintos nesta implantação.

Mudanças incrementam a versão e exigem novo percurso para a versão nova. O progresso anterior é preservado no Firestore até a primeira interação com a versão nova; tentativas completas permanecem como registros históricos separados. Esta estratégia é conservadora: não reaproveita automaticamente nota de uma instrução alterada.

Vídeo retoma o último ponto salvo (a cada 15 segundos e ao pausar). Conclusão de conteúdo é uma declaração de leitura/estudo do Irmão; não comprova tempo assistido. A carga concluída é estimada pelas aulas, não cronômetro de tela. PDF utiliza o leitor atual do Portal; nesta versão a retomada é na aula, sem marcador de página persistido. Jornada é organizada pelas trilhas e níveis cadastrados, sem etapas artificiais ou rankings.

Avaliações: nota mínima, tentativas por atividade, ordem das questões embaralhada, retorno imediato após envio ou posterior à revisão, obrigatório/opcional. Questões podem ser reutilizadas a partir do banco derivado das formações da Loja. A quantidade corresponde às questões efetivamente cadastradas na avaliação. Múltipla escolha, verdadeiro/falso, múltipla seleção, associação, ordenação, resposta curta, situação, reflexão e confirmação de leitura têm controles próprios. Nota é sempre calculada ou registrada no servidor.

O certificado depende das etapas obrigatórias e das avaliações obrigatórias aprovadas; se todas as etapas forem opcionais, exige concluir todas as aulas para certificar o percurso; nome, formação, carga, data, responsável, versão e código são exibidos na área autenticada. Não cria consulta pública com nome/desempenho. Não há ranking de notas ou leitura.

## Arquivos privados — preparação operacional

Usar um **novo Vercel Blob privado**, exclusivo do Conhecimento, configurando o segredo `KNOWLEDGE_BLOB_READ_WRITE_TOKEN`. Não trocar o token da Biblioteca e não converter o armazenamento existente.

Upload direto do navegador com autorização do servidor, limite de 250 MB e tipos MP4/WebM/PDF/JPEG/PNG/WebP. O SDK autentica o callback de conclusão; o arquivo só pode ser vinculado ao curso da mesma Loja. A aula serve o arquivo por `/api/conhecimento/media/{courseId}/{lessonId}`, com nova checagem de cadastro/grau, resposta privada sem cache e sem URL original. Apresentações são enviadas como PDF.

Links externos não recebem a proteção por grau do Portal. Use arquivos privados para materiais restritos. Capas são imagens editoriais públicas, não documentos reservados.

Sem o segredo privado, uploads e leitura de arquivos falham de modo fechado, com mensagem de configuração. Aulas de texto e atividades continuam possíveis após implantação de regras e índices. Nenhum conteúdo demonstrativo é semeado.

## Roteiro de implantação e aceite técnico

1. Revisar o PR e executar type-check, testes de domínio e build.
2. Publicar somente as alterações deste módulo; preservar a base atual do Portal.
3. Aplicar `firebase deploy --only firestore:rules,firestore:indexes` ao projeto já configurado em `.firebaserc`, com a credencial institucional; aguardar índices prontos. Não usar projeto de teste nem apagar coleções existentes.
4. Configurar o Blob privado e segredo específico, mantendo a Biblioteca intacta.
5. Conferir o papel dos responsáveis (Administração ou `knowledge:manage`). Sincronizar os papéis de fábrica pelo fluxo já existente quando necessário.
6. Administrador: criar rascunho, aulas, atividade e avaliação; vincular um livro existente; definir público, enviar à revisão, publicar.
7. Testar com contas distintas de Aprendiz, Companheiro e Mestre; validar ausência na busca e bloqueio de URL direta, mídia, envio de resposta e certificado para grau incompatível. Testar mudança de grau durante uma sessão e despublicação.
8. Confirmar concorrência de tentativas, revisão humana, retomada, conclusão e certificado. Conferir telas no celular.
9. Revisar/publicar Termos e Política atualizados na Administração. O formulário recebe o complemento 2.4.0 preparado para versões vigentes conhecidas de 2.0.0 a 2.3.1; o fluxo anterior da versão inicial é preservado. Confirmar versão vigente, texto e data antes de publicar; preparação não equivale à publicação ou ao aceite.

Não marcar como Production até confirmar esses passos com credenciais e sessões reais. O ambiente de desenvolvimento não contém credenciais do Firebase ou do armazenamento privado. Na consulta de configuração de 06/10/2026, o projeto Vercel `portal-irmaovl6-web` não possui `KNOWLEDGE_BLOB_READ_WRITE_TOKEN`; nenhuma configuração ou regra de produção foi alterada por esta implementação.

## Validação da implementação

- `pnpm --filter @vl6/domain test -- --run src/modules/knowledge/knowledge.test.ts`: 17 testes de autorização, gabarito, correção, conclusão e publicação.
- `pnpm --filter @vl6/ui exec vitest run --config vitest.knowledge.config.ts`: 16 testes de telas, transações de persistência e preparação jurídica.
- Type-check de web, domínio e infraestrutura aprovado; lint das rotas/componentes/actions do Conhecimento aprovado sem avisos.
- Build Next validado localmente com upload/telemetria do Sentry desativados apenas na verificação. A configuração original de produção é preservada. Avisos do build relativos a ícones não utilizados no módulo Central já existiam na base e não foram alterados.
- Os testes de persistência usam mocks das transações; não substituem teste no Firestore real. Não foi realizado aceite com contas institucionais de graus distintos nem confirmação visual em navegador: o download do navegador de testes falhou no ambiente. Esses pontos constam do roteiro de ativação.

## Exclusão administrativa — 07/10/2026

Na visão geral, `Excluir` consulta o impacto no servidor. Sem participação registrada, remove diretamente do catálogo. Com progresso de qualquer versão, exige confirmação explícita da quantidade afetada e da perda de acesso à formação, retomada e certificados. O servidor verifica novamente tenant, versão e quantidade em uma transação; se houver mudança, exige nova conferência. Exclusão lógica (`deletedAt`, `ativo=false`) preserva histórico, respostas, versões, anexos e vínculos bibliográficos sem alterar Acervo ou Biblioteca. Grava auditoria com ator/data/impacto. Edições concorrentes não podem restaurar o registro excluído.

Não existe matrícula administrativa nesta versão: autorização é por Grau e publicação; participação é registrada ao iniciar uma aula. A exclusão não introduz cadastro de matrícula.
