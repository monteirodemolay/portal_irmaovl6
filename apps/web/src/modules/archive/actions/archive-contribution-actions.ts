'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import {
  archiveContributionSchema,
  errorToLogContext,
  logger,
  type ArchiveContributionTypeKey,
} from '@vl6/shared';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface ArchiveContributionActionState {
  error: string | null;
  ok: boolean;
}

const EMPTY_STATE: ArchiveContributionActionState = { error: null, ok: false };

// Faixa MIME por tipo de contribuição — mais permissiva que o cadastro
// administrativo de Arquivos (aceita foto de documento escaneado), já que
// aqui o conteúdo ainda vai passar por moderação antes de virar item
// formal do Acervo.
const ALLOWED_CONTRIBUTION_MIME_TYPES: Record<'documento' | 'fotografia', string[]> = {
  documento: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
  fotografia: ['image/jpeg', 'image/png', 'video/mp4', 'video/webm'],
};

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const COMBINING_MARKS_PATTERN = new RegExp(
  `[${String.fromCodePoint(0x0300)}-${String.fromCodePoint(0x036f)}]`,
  'g',
);

function sanitizeFileName(name: string): string {
  const withoutAccents = name.normalize('NFKD').replace(COMBINING_MARKS_PATTERN, '');
  const safe = withoutAccents.replace(/[^a-zA-Z0-9._-]/g, '-');
  return safe.slice(-150) || 'arquivo';
}

function validateContributionUpload(file: File, tipo: ArchiveContributionTypeKey): string | null {
  if (tipo === 'memoria') return null;
  const allowed = ALLOWED_CONTRIBUTION_MIME_TYPES[tipo];
  if (!allowed.includes(file.type)) {
    return 'O arquivo enviado não corresponde ao tipo selecionado.';
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return 'Arquivo muito grande: o limite é 10 MB.';
  }
  return null;
}

export async function submitArchiveContributionAction(
  _prevState: ArchiveContributionActionState,
  formData: FormData,
): Promise<ArchiveContributionActionState> {
  const session = await requireSession();

  let fields;
  try {
    fields = archiveContributionSchema.parse({
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao'),
      tipo: formData.get('tipo'),
    });
  } catch {
    return { ...EMPTY_STATE, error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const rawFile = formData.get('arquivo');
  const file = rawFile instanceof File && rawFile.size > 0 ? rawFile : null;

  if (fields.tipo !== 'memoria' && !file) {
    return { ...EMPTY_STATE, error: 'Selecione um arquivo para enviar.' };
  }

  if (file) {
    const validationError = validateContributionUpload(file, fields.tipo);
    if (validationError) {
      return { ...EMPTY_STATE, error: validationError };
    }
  }

  let arquivoUrl: string | null = null;
  let tamanhoBytes: number | null = null;
  let uploadPath: string | null = null;
  const storage = new VercelBlobStorageAdapter();

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer());
    uploadPath = `tenants/${session.authContext.tenantId}/contributions/${randomUUID()}-${sanitizeFileName(file.name)}`;
    try {
      const upload = await storage.upload({
        path: uploadPath,
        buffer,
        contentType: file.type || 'application/octet-stream',
      });
      arquivoUrl = upload.url;
      tamanhoBytes = upload.sizeBytes;
    } catch (error) {
      logger.error('Falha ao enviar arquivo de contribuição para o storage', {
        route: 'submitArchiveContributionAction',
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'submitArchiveContributionAction' } });
      return {
        ...EMPTY_STATE,
        error: 'Não foi possível enviar o arquivo. Tente novamente em instantes.',
      };
    }
  }

  const container = createServerContainer();
  const result = await container.useCases.submitArchiveContribution.execute(session.authContext, {
    ...fields,
    arquivoUrl,
    tamanhoBytes,
  });
  if (!result.ok) {
    if (uploadPath) {
      try {
        await storage.delete(uploadPath);
      } catch (error) {
        logger.error('Falha ao reverter upload órfão de contribuição', {
          route: 'submitArchiveContributionAction',
          uploadPath,
          ...errorToLogContext(error),
        });
        Sentry.captureException(error, {
          tags: { route: 'submitArchiveContributionAction:rollback' },
        });
      }
    }
    // `code === 'not_found'` aqui só acontece quando a sessão autenticada
    // não tem nenhum cadastro de Irmão vinculado (usuário só de acesso
    // administrativo, sem `Member`) — mensagem amigável em vez de vazar o
    // erro de domínio bruto (nome de entidade + uid).
    const friendlyError =
      result.error.code === 'not_found'
        ? 'Seu usuário não está vinculado a um cadastro de Irmão. Fale com a Administração da Loja.'
        : result.error.message;
    return { ...EMPTY_STATE, error: friendlyError };
  }

  revalidatePath('/acervo/contribuir');
  return { error: null, ok: true };
}

export async function moderateArchiveContributionAction(
  contributionId: string,
  aprovar: boolean,
  motivoRejeicao: string | null,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.moderateArchiveContribution.execute(
    session.authContext,
    contributionId,
    aprovar,
    motivoRejeicao,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/contribuicoes');
}
