'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import {
  errorToLogContext,
  fileAssetSchema,
  fileCategorySchema,
  logger,
  type FileKind,
} from '@vl6/shared';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface DocumentManagementActionState {
  error: string | null;
}

// Tipos MIME aceitos por categoria — cobre os formatos exigidos pela
// auditoria (PDF, DOC/DOCX, XLS/XLSX, JPG/PNG) mais os tipos que o enum
// FILE_KINDS já suporta (powerpoint, video). O `file.type` enviado pelo
// browser precisa bater com a categoria escolhida no formulário — hoje
// `tipo` era 100% confiança do <select>, dissociado do conteúdo real.
const ALLOWED_FILE_MIME_TYPES: Record<FileKind, string[]> = {
  pdf: ['application/pdf'],
  word: [
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  excel: [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  powerpoint: [
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  imagem: ['image/jpeg', 'image/png'],
  video: ['video/mp4', 'video/webm'],
};

// Dentro do teto de `bodySizeLimit: '20mb'` de Server Actions (next.config.ts)
// — acima dele, um arquivo maior falha com o erro genérico do Next em vez de
// uma mensagem amigável.
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function validateFileAssetUpload(file: File, tipo: string): string | null {
  const allowed = ALLOWED_FILE_MIME_TYPES[tipo as FileKind];
  if (!allowed) {
    return 'Tipo de arquivo inválido.';
  }
  if (!allowed.includes(file.type)) {
    return 'O arquivo enviado não corresponde ao tipo selecionado.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Arquivo muito grande: o limite é 10 MB.';
  }
  return null;
}

// Faixa Unicode "Combining Diacritical Marks" (U+0300-U+036F), construída via
// code points para evitar caracteres de combinação literais no código-fonte.
const COMBINING_MARKS_PATTERN = new RegExp(
  `[${String.fromCodePoint(0x0300)}-${String.fromCodePoint(0x036f)}]`,
  'g',
);

/** Remove acentos e caracteres fora de [a-zA-Z0-9._-] do nome original antes de compor o path no storage. */
function sanitizeFileName(name: string): string {
  const withoutAccents = name.normalize('NFKD').replace(COMBINING_MARKS_PATTERN, '');
  const safe = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '-');
  return safe.slice(-150) || 'arquivo';
}

export async function createFileCategoryAction(
  _prevState: DocumentManagementActionState,
  formData: FormData,
): Promise<DocumentManagementActionState> {
  const session = await requireSession();

  let input;
  try {
    input = fileCategorySchema.parse({
      nome: formData.get('nome'),
      acervo: formData.get('acervo') || null,
      ordem: formData.get('ordem') || 0,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createFileCategory.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/arquivos');
  return { error: null };
}

export async function createFileAssetAction(
  _prevState: DocumentManagementActionState,
  formData: FormData,
): Promise<DocumentManagementActionState> {
  const session = await requireSession();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione um arquivo para enviar.' };
  }

  let fields;
  try {
    fields = fileAssetSchema.omit({ urlArquivo: true, tamanhoBytes: true }).parse({
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao') || null,
      categoriaId: formData.get('categoriaId'),
      acervo: formData.get('acervo') || null,
      autor: formData.get('autor') || null,
      tipo: formData.get('tipo'),
      urlMiniatura: formData.get('urlMiniatura') || null,
      permitirDownload: formData.get('permitirDownload') === 'on',
      ordem: formData.get('ordem') || 0,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const validationError = validateFileAssetUpload(file, fields.tipo);
  if (validationError) {
    return { error: validationError };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = new VercelBlobStorageAdapter();
  const path = `tenants/${session.authContext.tenantId}/files/${randomUUID()}-${sanitizeFileName(file.name)}`;

  let upload;
  try {
    upload = await storage.upload({
      path,
      buffer,
      contentType: file.type || 'application/octet-stream',
    });
  } catch (error) {
    logger.error('Falha ao enviar arquivo para o storage', {
      route: 'createFileAssetAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'createFileAssetAction' } });
    return { error: 'Não foi possível enviar o arquivo. Tente novamente em instantes.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createFileAsset.execute(session.authContext, {
    ...fields,
    urlArquivo: upload.url,
    tamanhoBytes: upload.sizeBytes,
  });
  if (!result.ok) {
    // Upload no storage já foi feito — sem isso o blob fica órfão (nunca
    // referenciado por nenhum FileAsset).
    try {
      await storage.delete(path);
    } catch (error) {
      logger.error('Falha ao reverter upload órfão após erro no banco', {
        route: 'createFileAssetAction',
        path,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'createFileAssetAction:rollback' } });
    }
    return { error: result.error.message };
  }

  revalidatePath('/admin/acervo/arquivos');
  redirect('/admin/acervo/arquivos');
}

export async function toggleFileAssetPublishedAction(
  fileId: string,
  publicar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishFileAsset.execute(
    session.authContext,
    fileId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/arquivos');
}

export async function softDeleteFileAssetAction(fileId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteFileAsset.execute(session.authContext, fileId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/arquivos');
}
