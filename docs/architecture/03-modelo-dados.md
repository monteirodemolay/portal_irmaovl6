# 3. Modelo de Dados (Firestore)

## 3.1 Campos-base obrigatórios (todas as coleções)

Toda entidade persistida estende `BaseEntity`:

```ts
interface BaseEntity {
  id: string; // Firestore document id
  tenantId: string; // isolamento multi-tenant — indexado, sempre no filtro
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // uid do usuário
  updatedBy: string; // uid do usuário
  deletedAt: Timestamp | null; // soft delete — nunca excluir fisicamente
  status: 'active' | 'inactive' | 'archived' | 'draft';
  ativo: boolean; // flag de conveniência para queries simples (espelha status !== 'inactive')
}
```

Regra de negócio global: **nenhum repositório expõe operação de `delete` físico.**
Todo "excluir" na UI executa `softDelete()`, que seta `deletedAt` e `status =
'archived'`. Toda query de listagem filtra `deletedAt == null` por padrão.

## 3.2 Coleções

Todas as coleções são **flat (top-level)**, filtradas por `tenantId` em toda
query (estratégia _pool model_ — ver doc 01 §1.6).

### tenants

Representa cada Loja instalada na plataforma.

```
id, tenantId (= próprio id), nome, numero, potencia, dominio, subdominio,
brasaoUrl, logotipoUrl, endereco { logradouro, numero, bairro, cidade, estado,
pais, cep }, telefone, whatsapp, site, email, modulosHabilitados: string[],
paginaInicialConfig, planoAssinatura, ...BaseEntity
```

### tenantBranding

Configuração visual isolada da entidade `tenants` (permite versionar/reverter
sem tocar em dados cadastrais).

```
id, tenantId, corPrimaria, corSecundaria, corDestaque, corFundo, tipografia,
raioBorda, modoEscuroHabilitado, faviconUrl, ...BaseEntity
```

### tenantSettings

```
id, tenantId, idiomaPadrao, textosInstitucionais: Record<string,string>,
itensMenu: MenuItemConfig[], rodape: FooterConfig, integracoesHabilitadas:
string[], ...BaseEntity
```

### users

Conta de acesso (1:1 com Firebase Auth `uid`; pode ou não ter um `Member`
vinculado — ex.: um Visitante tem `users` sem `members`).

```
id (= Firebase uid), tenantId, email, memberId | null, roleId, mfaHabilitado,
ultimoLogin, statusConta: 'pending' | 'active' | 'blocked', ...BaseEntity
```

### roles

```
id, tenantId, nome, chave: RoleKey, permissoes: PermissionKey[], sistemico:
boolean (papéis padrão não editáveis), ...BaseEntity
```

### members ("Irmãos")

```
id, tenantId, userId | null, nomeCompleto, nomeMaconico, fotoUrl, email,
telefone, whatsapp, endereco {...}, dataNascimento, dataIniciacao,
dataElevacao, dataExaltacao, cim, matricula, grau: 'aprendiz' | 'companheiro'
| 'mestre', cargoAtualId (ref boardPositionAssignments), situacao:
'regular' | 'irregular' | 'remido' | 'inativo' | 'falecido' | 'transferido',
lojaId, potencia, profissao, empresa, estadoCivil, biografia,
redesSociais { instagram, facebook, linkedin }, observacoes, ...BaseEntity
```

### memberPositionHistory

```
id, tenantId, memberId, cargo, gestaoId, dataInicio, dataFim | null,
observacoes, ...BaseEntity
```

### boardTerms ("Gestões")

```
id, tenantId, periodoInicio, periodoFim, nome (ex. "Gestão 2026/2027"),
ativo, ...BaseEntity
```

### boardPositionAssignments (cargos dentro de uma gestão)

```
id, tenantId, gestaoId, cargo: BoardPositionKey (veneravel_mestre,
primeiro_vigilante, segundo_vigilante, orador, secretario, tesoureiro,
chanceler, hospitaleiro, mestre_harmonia, mestre_cerimonias, diacono,
experto, cobridor — enum extensível), memberId, ordem, ...BaseEntity
```

> Diáconos e Expertos permitem múltiplas ocorrências por gestão (1º/2º
> Diácono etc.) — diferenciados pelo campo `ordem`.

### committees ("Comissões")

```
id, tenantId, gestaoId, nome, descricao, membrosIds: string[], ...BaseEntity
```

### fileCategories

```
id, tenantId, nome, acervo, ordem, ...BaseEntity
```

### files ("Arquivos")

```
id, tenantId, titulo, descricao, categoriaId, acervo, autor, tipo: 'pdf' |
'word' | 'excel' | 'powerpoint' | 'imagem' | 'video', urlArquivo,
urlMiniatura, versao, publicado, permitirDownload, contagemDownloads,
contagemVisualizacoes, dataPublicacao, ordem, tamanhoBytes, ...BaseEntity
```

### libraryCategories / librarySubcategories

```
id, tenantId, nome, categoriaPaiId | null, ordem, ...BaseEntity
```

### libraryItems

```
id, tenantId, fileId (ref `files`), categoriaId, subcategoriaId,
permiteLeituraOnline, contagemDownloads, contagemVisualizacoes, ...BaseEntity
```

### libraryFavorites

```
id, tenantId, userId, libraryItemId, ...BaseEntity
```

### events ("Agenda/Eventos")

```
id, tenantId, tipo: 'sessao' | 'evento' | 'curso' | 'palestra' |
'confraternizacao' | 'aniversario', titulo, descricao, local, dataInicio,
dataFim, exigeConfirmacaoPresenca, capacidadeMaxima | null, ...BaseEntity
```

### eventAttendance

```
id, tenantId, eventId, memberId, status: 'confirmado' | 'recusado' |
'pendente', respondidoEm, ...BaseEntity
```

### news ("Notícias")

```
id, tenantId, titulo, subtitulo, slug, imagemCapaUrl, conteudoHtml, autorId,
categoria, publicado, dataPublicacao, contagemVisualizacoes, ...BaseEntity
```

### newsComments

```
id, tenantId, newsId, autorId, texto, moderado, ...BaseEntity
```

### announcements ("Avisos")

```
id, tenantId, titulo, descricao, prioridade: 'baixa' | 'media' | 'alta',
publicado, destacar, dataPublicacao, dataExpiracao | null, ...BaseEntity
```

### galleryAlbums

```
id, tenantId, titulo, categoria, capaUrl, dataEvento, ...BaseEntity
```

### galleryMedia

```
id, tenantId, albumId, tipo: 'foto' | 'video', url, urlMiniatura, ordem,
...BaseEntity
```

### auditLogs (append-only, sem soft delete — nunca se altera nem se apaga)

```
id, tenantId, entidade, entidadeId, acao: 'create' | 'update' | 'delete' |
'restore' | 'login' | 'permission_change', usuarioId, ip, dispositivo,
valorAnterior: unknown, valorNovo: unknown, timestamp
```

### notifications

```
id, tenantId, destinatarioId, tipo, titulo, mensagem, lida, canal: 'interno'
| 'email' | 'push' | 'whatsapp' | 'telegram', link | null, ...BaseEntity
```

### notificationPreferences

```
id, tenantId, userId, canaisHabilitados: string[], ...BaseEntity
```

### publicPages (CMS institucional)

```
id, tenantId, slug ('home' | 'historia' | 'nossa-loja' | ...), blocos:
PublicPageBlock[] (tipo, conteúdo, ordem), publicado, ...BaseEntity
```

### links ("Links Úteis")

```
id, tenantId, titulo, url, icone, categoria, ordem, ...BaseEntity
```

## 3.3 Índices compostos previstos (`firestore.indexes.json`)

| Coleção       | Campos do índice                                                |
| ------------- | --------------------------------------------------------------- |
| members       | tenantId ASC, situacao ASC, nomeCompleto ASC                    |
| members       | tenantId ASC, grau ASC, cargoAtualId ASC                        |
| files         | tenantId ASC, categoriaId ASC, publicado ASC, ordem ASC         |
| events        | tenantId ASC, dataInicio ASC, tipo ASC                          |
| news          | tenantId ASC, publicado ASC, dataPublicacao DESC                |
| announcements | tenantId ASC, publicado ASC, destacar DESC, dataPublicacao DESC |
| auditLogs     | tenantId ASC, entidade ASC, timestamp DESC                      |
| notifications | tenantId ASC, destinatarioId ASC, lida ASC, createdAt DESC      |

## 3.4 Firestore Security Rules — estratégia

Regras centralizadas por função reutilizável (`firestore.rules`):

```
function isSignedIn() { return request.auth != null; }
function tenantOf(doc) { return doc.data.tenantId; }
function sameTenant(doc) { return isSignedIn() && request.auth.token.tenantId == tenantOf(doc); }
function hasPermission(perm) { return isSignedIn() && perm in request.auth.token.permissions; }
function isOwner(doc) { return isSignedIn() && request.auth.uid == doc.data.createdBy; }
```

Cada coleção declara regras `allow read/write` combinando `sameTenant()` +
`hasPermission('<recurso>:<acao>')` (chaves de permissão definidas na doc 08).
`tenantId` e `permissions` são propagados via **Custom Claims** do Firebase
Auth (atualizados por `syncUserClaims`, chamado explicitamente por toda
Server Action que cria conta ou muda papel — ver doc 07 §7.3). Isso evita
uma leitura extra ao Firestore a cada avaliação de regra.

`auditLogs` tem regra especial: **write somente via Admin SDK**, nunca
diretamente do client — garante integridade da trilha. Na prática, isso
acontece dentro da própria Server Action que faz a escrita de negócio
(`withAudit`, `packages/infra` — ver doc 06 §6.7), não mais um trigger
separado.

## 3.5 Exportação / Backup

- Backup automático diário via Vercel Cron (`/api/cron/daily-backup`,
  `apps/web/vercel.json`) exportando cada coleção como JSON para o Vercel
  Blob, sob `backups/{data}/` (sem plano Blaze, `firestore.export`/Cloud
  Storage não são opção — ver doc 01 §1.3).
- Exportação sob demanda (JSON, CSV, Excel, PDF) implementada como caso de uso
  de aplicação (`ExportCollectionUseCase`) reutilizado pela API e pela UI
  administrativa, nunca duplicado por módulo.
