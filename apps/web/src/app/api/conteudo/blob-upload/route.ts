import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Token de upload direto do navegador pro Vercel Blob das fotos de uma
 * Notícia (`NewsForm`) — mesmo motivo de `/api/comunicacao/blob-upload`: o
 * teto de 4,5 MB do corpo de uma Server Action/Route Handler na Vercel
 * derrubaria fotos de câmera/celular com "413" antes do nosso código rodar.
 * O binário nunca passa pela função serverless; só a URL final volta pro
 * formulário e é gravada dentro do HTML da notícia ao salvar.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (
    !session ||
    !(
      hasPermission(session.authContext, 'news:create') ||
      hasPermission(session.authContext, 'news:update')
    )
  ) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        addRandomSuffix: true,
        maximumSizeInBytes: 20 * 1024 * 1024,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    logger.error('Falha ao gerar token de upload direto das fotos da notícia', {
      route: 'POST /api/conteudo/blob-upload',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'POST /api/conteudo/blob-upload' } });
    return NextResponse.json({ error: 'Falha no upload.' }, { status: 400 });
  }
}
