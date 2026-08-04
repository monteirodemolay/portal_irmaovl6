# 6. Regras de Negócio por Módulo

## 6.1 Membership (Irmãos)

- `matricula` é única por `tenantId`.
- `cim` é único por `tenantId` quando informado.
- Alterar `situacao` para `falecido` ou `transferido` dispara automaticamente
  o encerramento (`dataFim = now`) do cargo ativo em `memberPositionHistory`,
  se existir.
- Um `Member` só pode ter **um** registro em `memberPositionHistory` com
  `dataFim == null` por vez (cargo atual único).
- Excluir um Irmão é sempre soft delete; o histórico de cargos e presenças
  permanece intacto para fins de auditoria/histórico da Loja.

## 6.2 Governance (Gestões / Diretoria / Comissões)

- Períodos de `boardTerms` não podem se sobrepor dentro do mesmo `tenantId`.
- Cada `cargo` de `BoardPositionKey` de ocorrência única (Venerável Mestre, 1º
  Vigilante, Orador, Secretário, Tesoureiro, Chanceler, Hospitaleiro, Mestre
  de Harmonia, Mestre de Cerimônias, Cobridor) admite **no máximo um**
  `memberId` ativo por `gestaoId`. Diácono e Experto admitem múltiplos
  (diferenciados por `ordem`).
- Ao criar/ativar uma nova `BoardTerm`, o sistema oferece copiar a estrutura
  de comissões da gestão anterior como ponto de partida (não obrigatório).
- Atribuir um cargo a um `Member` grava automaticamente uma entrada em
  `memberPositionHistory`.

## 6.3 Document Management & Library

- Upload dispara Cloud Function (`on-file-uploaded`) que: valida tipo/tamanho,
  gera miniatura (para imagem/PDF/vídeo), extrai metadados básicos, e só
  então marca o arquivo como pronto para publicação.
- `contagemDownloads` e `contagemVisualizacoes` são incrementados via
  transação atômica no servidor (nunca escritos diretamente pelo client) para
  evitar manipulação.
- Arquivo com `publicado = false` não aparece em nenhuma listagem fora do
  Painel Administrativo, independente de RBAC de leitura.
- `permitirDownload = false` mantém leitura online habilitada mas oculta o
  botão de download e bloqueia a rota de download na API.
- Itens de Biblioteca (`libraryItems`) sempre referenciam um `FileAsset`
  existente — não duplicam o binário; a Biblioteca é uma **camada de
  curadoria/categorização** sobre Arquivos.

## 6.4 Agenda / Eventos

- `dataFim` deve ser posterior a `dataInicio`.
- Quando `exigeConfirmacaoPresenca = true`, o evento fica visível no
  dashboard do Irmão com ação de confirmar/recusar até a data do evento.
- Se `capacidadeMaxima` for atingida, novas confirmações entram como
  `pendente` com opção de lista de espera (regra evolutiva — v1.1).
- Eventos do tipo `aniversario` são gerados automaticamente por uma função
  agendada (`birthday-reminder`) a partir de `Member.dataNascimento`, não
  cadastrados manualmente.

## 6.5 Content (Notícias / Avisos)

- `slug` de `News` é único por tenant, gerado a partir do título e editável.
- Publicação segue o pipeline padrão: `draft → active (publicado=true) →
  archived`. Nenhum conteúdo pula etapas via API pública.
- `NewsComments` passam por moderação (`moderado = false` por padrão);
  comentário só aparece publicamente após aprovação por um papel com
  permissão `news:manage`.
- `Announcement.destacar = true` limita-se a no máximo 3 avisos destacados
  simultâneos por tenant (regra de UX para não poluir o topo do dashboard) —
  o 4º destaque automaticamente desmarca o mais antigo.
- `dataExpiracao` vencida remove o aviso das listagens ativas sem excluir o
  registro (é apenas filtrado por data, preservando histórico).

## 6.6 Identity & Access (RBAC) — ver detalhamento completo na doc 08

- Todo `User` possui exatamente um `Role` ativo.
- Mudança de `Role` de um usuário dispara Cloud Function que atualiza os
  Custom Claims do Firebase Auth (`tenantId`, `permissions`) — necessário
  para refletir imediatamente nas Security Rules.
- Papéis `sistemico = true` (Administrador Geral, Administrador, Irmão,
  Visitante) não podem ser excluídos nem ter permissões básicas removidas
  pela UI — apenas papéis customizados criados pelo tenant são totalmente
  editáveis.

## 6.7 Audit (Auditoria)

- Toda escrita (`create`, `update`, `delete`/soft-delete, `restore`) em
  entidades de negócio dispara, via Cloud Function trigger no Firestore, a
  gravação de um `AuditLog` com valor anterior e novo (diff), IP e
  dispositivo capturados no momento da requisição original.
- `AuditLog` é **imutável**: não existe caso de uso de update/delete para
  essa coleção em nenhuma camada.
- Login, logout e alterações de permissão também geram `AuditLog`
  (`acao: 'login' | 'permission_change'`).

## 6.8 Notification

- Toda publicação de `Announcement` com `prioridade = 'alta'` dispara
  notificação automática (`canal: 'interno'` sempre; demais canais conforme
  `NotificationPreference` do destinatário).
- Canais `whatsapp` e `telegram` ficam com contrato de domínio pronto
  (`INotificationGateway`) mas implementação adiada — ver roadmap doc 10.

## 6.9 Regra transversal — Multi-tenancy

- **Nenhum caso de uso aceita `tenantId` vindo do client sem revalidar contra
  a sessão autenticada.** O `tenantId` efetivo de toda operação vem do
  contexto de autenticação (Custom Claim), nunca de um parâmetro de
  formulário — previne vazamento/contaminação entre Lojas por manipulação de
  payload.
