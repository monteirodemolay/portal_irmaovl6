import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';
import { NextResponse, type NextRequest } from 'next/server';
import archiver from 'archiver';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { fetchArchiveMediaBinary } from '@/modules/archive/lib/fetch-archive-media-binary';
import { loadEventAlbum } from '@/modules/archive/lib/load-event-album';
import { sanitizeExportFilename } from '@/modules/archive/lib/sanitize-export-filename';

export const runtime = 'nodejs';

// Chave por uid — empacotar um ZIP é caro (N downloads de binário + gzip);
// limita quantas vezes o mesmo Irmão pode disparar, não o NAT/escritório
// inteiro (mesmo raciocínio do rate limiter de exportação de Irmãos).
const zipRateLimiter = new RateLimiter();

/**
 * "Baixar tudo em ZIP" do álbum público de um evento (Fase D, docs/
 * architecture/11-acervo-vl6.md). RESTRIÇÃO DE SEGURANÇA: rota autenticada
 * que reconfirma a sessão a cada chamada e empacota o ZIP inteiramente em
 * memória de resposta, sem nunca gravar o arquivo em nenhum storage — o
 * binário só existe durante esta requisição, entregue via streaming direto
 * (`Content-Disposition: attachment`). Não há, e nunca deve haver, uma URL
 * que sirva este ZIP depois sem uma nova autenticação — o usuário já pediu
 * explicitamente para nunca existir nada compartilhável assim no Acervo.
 *
 * Reaproveita `loadEventAlbum` (mesma filtragem de `publicacaoStatus`/
 * `accessLevel` da página pública) e só empacota mídia com
 * `allowDownload === true` — a mesma regra já usada pelos botões de
 * download individuais do álbum, nunca duplicada aqui.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
): Promise<Response> {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!hasPermission(session.authContext, 'archiveMedia:read')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const limit = zipRateLimiter.check(session.user.id, { limit: 6, windowMs: 60 * 1000 });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const { eventId } = await params;
    const container = createServerContainer();

    const album = await loadEventAlbum(container, session.authContext, session.role, eventId);
    if (!album) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const downloadable = album.media.filter((item) => item.allowDownload);
    if (downloadable.length === 0) {
      return NextResponse.json({ error: 'nothing_downloadable' }, { status: 404 });
    }

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('warning', (warning) => {
      logger.error('Aviso do archiver ao montar o ZIP do álbum do evento', {
        route: 'GET /api/acervo/eventos/[eventId]/zip',
        eventId,
        ...errorToLogContext(warning),
      });
    });
    archive.on('error', (archiveError) => {
      logger.error('Erro do archiver ao montar o ZIP do álbum do evento', {
        route: 'GET /api/acervo/eventos/[eventId]/zip',
        eventId,
        ...errorToLogContext(archiveError),
      });
    });

    const usedNames = new Set<string>();
    function uniqueEntryName(preferred: string): string {
      if (!usedNames.has(preferred)) {
        usedNames.add(preferred);
        return preferred;
      }
      let index = 2;
      let candidate = `${preferred}-${index}`;
      while (usedNames.has(candidate)) {
        index += 1;
        candidate = `${preferred}-${index}`;
      }
      usedNames.add(candidate);
      return candidate;
    }

    // Anexa cada binário ao ZIP conforme ele chega — nenhum arquivo
    // intermediário em disco/storage, tudo em streaming.
    void (async () => {
      for (const item of downloadable) {
        const binary = await fetchArchiveMediaBinary(
          container,
          session.authContext.tenantId,
          item.id,
        );
        if (!binary.ok) {
          logger.error('Mídia do álbum ficou indisponível ao montar o ZIP — pulando este arquivo', {
            route: 'GET /api/acervo/eventos/[eventId]/zip',
            eventId,
            archiveMediaId: item.id,
          });
          continue;
        }
        const safeCaption = item.caption ? sanitizeExportFilename(item.caption, '') : '';
        const preferredName = safeCaption
          ? `${safeCaption}-${sanitizeExportFilename(item.originalName, item.originalName)}`
          : sanitizeExportFilename(item.originalName, item.originalName);
        archive.append(
          Readable.fromWeb(binary.webStream as unknown as NodeWebReadableStream<Uint8Array>),
          { name: uniqueEntryName(preferredName) },
        );
      }
      void archive.finalize();
    })();

    const zipFilename = `${sanitizeExportFilename(album.event.titulo, 'acervo-evento')}.zip`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/zip');
    headers.set(
      'Content-Disposition',
      `attachment; filename="acervo.zip"; filename*=UTF-8''${encodeURIComponent(zipFilename)}`,
    );
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(Readable.toWeb(archive) as unknown as ReadableStream, { headers });
  } catch (error) {
    logger.error('Erro não tratado em GET /api/acervo/eventos/[eventId]/zip', {
      route: 'GET /api/acervo/eventos/[eventId]/zip',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, {
      tags: { route: 'GET /api/acervo/eventos/[eventId]/zip' },
    });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
