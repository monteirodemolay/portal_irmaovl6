import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';

export const runtime = 'nodejs';

/**
 * Gera o token de upload direto do navegador pro Vercel Blob — a Vercel
 * limita o corpo de uma Server Action/Route Handler a 4,5 MB (teto físico
 * da plataforma, não configurável por `next.config.ts`); a imagem de fundo
 * de um modelo ou a arte gerada em Story (alta resolução) passa disso com
 * frequência, derrubando o upload com "413 Content Too Large" antes mesmo
 * do nosso código rodar. Upload direto do navegador evita que o binário
 * passe pela função serverless — só a URL final chega ao servidor depois,
 * via `createArtTemplateAction`/`uploadPublicationAssetAction`.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const session = await getCurrentSession();
  if (!session || !hasPermission(session.authContext, 'communication:manage')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/png', 'image/jpeg'],
        addRandomSuffix: true,
        maximumSizeInBytes: 20 * 1024 * 1024,
      }),
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    logger.error('Falha ao gerar token de upload direto pro Vercel Blob', {
      route: 'POST /api/comunicacao/blob-upload',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'POST /api/comunicacao/blob-upload' } });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Falha no upload.' },
      { status: 400 },
    );
  }
}
