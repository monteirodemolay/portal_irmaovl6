import { createElement } from 'react';
import { NextResponse, type NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import * as Sentry from '@sentry/nextjs';
import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { errorToLogContext, logger } from '@vl6/shared';
import { getCurrentSession } from '@/lib/auth/get-current-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { RateLimiter } from '@/lib/api/rate-limiter';
import { rateLimitResponse } from '@/lib/api/rate-limit-response';
import { fetchArchiveMediaBinary } from '@/modules/archive/lib/fetch-archive-media-binary';
import { loadEventAlbum, type EventAlbumMediaItem } from '@/modules/archive/lib/load-event-album';
import { sanitizeExportFilename } from '@/modules/archive/lib/sanitize-export-filename';
import {
  EventAlbumPdfDocument,
  type EventAlbumPdfEntry,
} from '@/modules/archive/reports/event-album-pdf-document';

export const runtime = 'nodejs';

// Chave por uid — mesmo raciocínio do rate limiter do ZIP: gerar o PDF
// busca binário de cada fotografia embutida, é uma operação cara.
const pdfRateLimiter = new RateLimiter();

const MEDIA_TYPE_LABELS: Record<Exclude<EventAlbumMediaItem['mediaType'], 'foto'>, string> = {
  video: 'Vídeo',
  audio: 'Áudio',
  documento: 'Documento',
};

const EMBEDDABLE_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * "Exportar em PDF" do álbum público de um evento (Fase D, docs/
 * architecture/11-acervo-vl6.md) — catálogo pensado para impressão/arquivo
 * físico da Loja. RESTRIÇÃO DE SEGURANÇA: mesma cautela da rota de ZIP —
 * autenticada a cada chamada, o PDF é montado inteiramente em memória
 * (`renderToBuffer`) e devolvido direto na resposta, nunca gravado em
 * storage nem servido depois por uma URL própria.
 *
 * Reaproveita `loadEventAlbum` (mesma filtragem de `publicacaoStatus`/
 * `accessLevel` da página pública). Só embute o binário de uma fotografia
 * quando `allowDownload === true` (mesma regra do botão de download
 * individual) — as demais fotografias, e todo vídeo/áudio/documento (que
 * não são "imprimíveis"), entram só como entrada de texto com legenda.
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

    const limit = pdfRateLimiter.check(session.user.id, { limit: 6, windowMs: 60 * 1000 });
    if (!limit.allowed) {
      return rateLimitResponse(limit);
    }

    const { eventId } = await params;
    const container = createServerContainer();

    const [album, tenant] = await Promise.all([
      loadEventAlbum(container, session.authContext, session.role, eventId),
      getCurrentTenant(),
    ]);
    if (!album) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const entries: EventAlbumPdfEntry[] = [];
    for (const item of album.media) {
      if (item.mediaType === 'foto' && item.allowDownload) {
        const embeddable = EMBEDDABLE_MIME_TYPES.has(item.mimeType);
        if (embeddable) {
          const binary = await fetchArchiveMediaBinary(
            container,
            session.authContext.tenantId,
            item.id,
          );
          if (binary.ok) {
            const buffer = Buffer.from(await new Response(binary.webStream).arrayBuffer());
            entries.push({
              id: item.id,
              kind: 'foto-embutida',
              caption: item.caption,
              autor: item.autor,
              dataUri: `data:${binary.mimeType};base64,${buffer.toString('base64')}`,
            });
            continue;
          }
        }
      }

      const kindLabel =
        item.mediaType === 'foto'
          ? item.allowDownload
            ? 'Foto'
            : 'Foto (reservada)'
          : MEDIA_TYPE_LABELS[item.mediaType];

      entries.push({
        id: item.id,
        kind: item.mediaType === 'foto' ? 'foto-reservada' : item.mediaType,
        kindLabel,
        titulo: item.originalName,
        caption: item.caption,
        autor: item.autor,
        tamanho: formatBytes(item.sizeBytes),
        pessoas: item.pessoasIdentificadas.map((pessoa) => pessoa.nomeCompleto),
      });
    }

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(
      new Date(album.event.dataInicio),
    );
    const geradoEm = new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const pdfDocument = createElement(EventAlbumPdfDocument, {
      tenantNome: tenant?.tenant.nome ?? 'Portal do Irmão',
      eventoTitulo: album.event.titulo,
      eventoDescricao: album.event.descricao,
      local: album.event.local,
      dataFormatada,
      boardTermNome: album.boardTermNome,
      geradoEm,
      entries,
    }) as unknown as Parameters<typeof renderToBuffer>[0];

    const buffer = Buffer.from(await renderToBuffer(pdfDocument));
    const pdfFilename = `${sanitizeExportFilename(album.event.titulo, 'acervo-evento')}.pdf`;

    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set(
      'Content-Disposition',
      `attachment; filename="acervo.pdf"; filename*=UTF-8''${encodeURIComponent(pdfFilename)}`,
    );
    headers.set('Cache-Control', 'private, no-store');

    return new NextResponse(new Uint8Array(buffer), { headers });
  } catch (error) {
    logger.error('Erro não tratado em GET /api/acervo/eventos/[eventId]/pdf', {
      route: 'GET /api/acervo/eventos/[eventId]/pdf',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, {
      tags: { route: 'GET /api/acervo/eventos/[eventId]/pdf' },
    });
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
