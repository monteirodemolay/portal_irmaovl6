# 4. Contratos TypeScript de Domínio

Localização real destes tipos: `packages/domain/src/shared` e
`packages/domain/src/modules/*/entities`. Reproduzidos aqui como referência de
arquitetura — a implementação completa (com JSDoc, invariantes de validação
etc.) acontece na fase de código.

## 4.1 Base compartilhada

```ts
// packages/domain/src/shared/base-entity.ts
export type EntityStatus = 'active' | 'inactive' | 'archived' | 'draft';

export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  deletedAt: Date | null;
  status: EntityStatus;
  ativo: boolean;
}

// packages/domain/src/shared/result.ts
export type Result<T, E = DomainError> = { ok: true; value: T } | { ok: false; error: E };

export class DomainError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// packages/domain/src/shared/pagination.ts
export interface PageRequest {
  cursor?: string;
  limit: number; // obrigatório, máx. definido por módulo (padrão 20)
}
export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

## 4.2 Identity & Access

```ts
export type RoleKey =
  | 'super_admin' // Administrador Geral (cross-tenant, uso interno da plataforma)
  | 'admin' // Administrador da Loja
  | 'membro'; // Irmão — só leitura

export type PermissionKey = `${ResourceKey}:${ActionKey}`;
export type ActionKey = 'create' | 'read' | 'update' | 'delete' | 'publish' | 'export' | 'manage';
export type ResourceKey =
  | 'tenant'
  | 'branding'
  | 'member'
  | 'boardTerm'
  | 'committee'
  | 'file'
  | 'libraryItem'
  | 'event'
  | 'news'
  | 'announcement'
  | 'gallery'
  | 'user'
  | 'role'
  | 'auditLog';

export interface Role extends BaseEntity {
  nome: string;
  chave: RoleKey;
  permissoes: PermissionKey[];
  sistemico: boolean;
}

export interface User extends BaseEntity {
  email: string;
  memberId: string | null;
  roleId: string;
  mfaHabilitado: boolean;
  ultimoLogin: Date | null;
  statusConta: 'pending' | 'active' | 'blocked';
}
```

## 4.3 Membership

```ts
export type MemberDegree = 'aprendiz' | 'companheiro' | 'mestre';
export type MemberSituation =
  'regular' | 'irregular' | 'remido' | 'inativo' | 'falecido' | 'transferido';
export type MaritalStatus =
  'solteiro' | 'casado' | 'uniao_estavel' | 'separado_judicialmente' | 'divorciado' | 'viuvo';

export interface Address {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  cep: string;
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
}

export interface Member extends BaseEntity {
  userId: string | null;
  nomeCompleto: string;
  fotoUrl: string | null;
  /** Opcional — Irmãos importados em massa podem não ter e-mail ainda; ver `ClaimMemberAccountUseCase` (07 §7.2b). */
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  endereco: Address | null;
  dataNascimento: Date | null;
  dataIniciacao: Date | null;
  dataElevacao: Date | null;
  dataExaltacao: Date | null;
  /** Identificador único do Irmão na Loja — substituiu "matrícula"/"nome maçônico". */
  cim: string | null;
  grau: MemberDegree;
  cargoAtualId: string | null;
  situacao: MemberSituation;
  lojaId: string;
  potencia: string;
  profissao: string | null;
  empresa: string | null;
  estadoCivil: MaritalStatus | null;
  /** Só preenchidos quando `estadoCivil` implica cônjuge — ver `MARITAL_STATUSES_WITH_SPOUSE`. */
  conjugeNome: string | null;
  conjugeDataNascimento: Date | null;
  biografia: string | null;
  redesSociais: SocialLinks;
  observacoes: string | null;
}

export interface MemberPositionHistory extends BaseEntity {
  memberId: string;
  cargo: BoardPositionKey;
  gestaoId: string;
  dataInicio: Date;
  dataFim: Date | null;
  observacoes: string | null;
}
```

## 4.4 Governance

```ts
export type BoardPositionKey =
  | 'veneravel_mestre'
  | 'primeiro_vigilante'
  | 'segundo_vigilante'
  | 'orador'
  | 'secretario'
  | 'tesoureiro'
  | 'chanceler'
  | 'hospitaleiro'
  | 'mestre_harmonia'
  | 'mestre_cerimonias'
  | 'diacono'
  | 'experto'
  | 'cobridor';

export interface BoardTerm extends BaseEntity {
  nome: string;
  periodoInicio: Date;
  periodoFim: Date;
}

export interface BoardPositionAssignment extends BaseEntity {
  gestaoId: string;
  cargo: BoardPositionKey;
  memberId: string;
  ordem: number;
}

export interface Committee extends BaseEntity {
  gestaoId: string;
  nome: string;
  descricao: string | null;
  membrosIds: string[];
}
```

## 4.5 Document Management & Library

```ts
export type FileKind = 'pdf' | 'word' | 'excel' | 'powerpoint' | 'imagem' | 'video';

export interface FileAsset extends BaseEntity {
  titulo: string;
  descricao: string | null;
  categoriaId: string;
  acervo: string | null;
  autor: string | null;
  tipo: FileKind;
  urlArquivo: string;
  urlMiniatura: string | null;
  versao: number;
  publicado: boolean;
  permitirDownload: boolean;
  contagemDownloads: number;
  contagemVisualizacoes: number;
  dataPublicacao: Date | null;
  ordem: number;
  tamanhoBytes: number;
}

export interface LibraryItem extends BaseEntity {
  fileId: string;
  categoriaId: string;
  subcategoriaId: string | null;
  permiteLeituraOnline: boolean;
  contagemDownloads: number;
  contagemVisualizacoes: number;
}
```

## 4.6 Agenda

```ts
export type EventKind =
  'sessao' | 'evento' | 'curso' | 'palestra' | 'confraternizacao' | 'aniversario';

export interface Event extends BaseEntity {
  tipo: EventKind;
  titulo: string;
  descricao: string | null;
  local: string;
  dataInicio: Date;
  dataFim: Date;
  exigeConfirmacaoPresenca: boolean;
  capacidadeMaxima: number | null;
}

export interface EventAttendance extends BaseEntity {
  eventId: string;
  memberId: string;
  status: 'confirmado' | 'recusado' | 'pendente';
  respondidoEm: Date | null;
}
```

## 4.7 Content (News & Announcements)

```ts
export interface News extends BaseEntity {
  titulo: string;
  subtitulo: string | null;
  slug: string;
  imagemCapaUrl: string | null;
  conteudoHtml: string;
  autorId: string;
  categoria: string;
  publicado: boolean;
  dataPublicacao: Date | null;
  contagemVisualizacoes: number;
}

export type AnnouncementPriority = 'baixa' | 'media' | 'alta';

export interface Announcement extends BaseEntity {
  titulo: string;
  descricao: string;
  prioridade: AnnouncementPriority;
  publicado: boolean;
  destacar: boolean;
  dataPublicacao: Date | null;
  dataExpiracao: Date | null;
}
```

## 4.8 Zod — exemplo de contrato compartilhado (client + server)

```ts
// packages/shared/src/schemas/member.schema.ts
import { z } from 'zod';

export const memberSchema = z.object({
  nomeCompleto: z.string().min(3).max(150),
  // Opcional — cadastro manual e importação em massa (planilha/PDF) podem
  // não trazer e-mail; o próprio Irmão reivindica o acesso depois (07 §7.2b).
  email: z.string().email().nullable(),
  telefone: z.string().nullable(),
  cim: z.string().nullable(),
  grau: z.enum(['aprendiz', 'companheiro', 'mestre']),
  situacao: z.enum(['regular', 'irregular', 'remido', 'inativo', 'falecido', 'transferido']),
  dataNascimento: z.coerce.date().nullable(),
  dataIniciacao: z.coerce.date().nullable(),
  dataElevacao: z.coerce.date().nullable(),
  dataExaltacao: z.coerce.date().nullable(),
});

export type MemberFormValues = z.infer<typeof memberSchema>;
```

Este schema é o **único** ponto de verdade de validação: usado em
`react-hook-form` (client), no caso de uso `RegisterMember` (server) e no
Route Handler da API REST (`/api/v1/members`).
