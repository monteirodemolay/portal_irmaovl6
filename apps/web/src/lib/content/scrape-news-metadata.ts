import 'server-only';
import { logger } from '@vl6/shared';
import * as Sentry from '@sentry/nextjs';
import { extractOgMetadata } from '@/modules/content/lib/extract-og-metadata';

const FETCH_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortalVL6/1.0)' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export type ScrapeNewsMetadataResult =
  | { ok: true; title: string; description: string | null; image: string | null }
  | { ok: false; error: string };

/**
 * Busca uma página pública (pensada pra /noticias do vl6.com.br, hoje um
 * site Wix) e extrai título/resumo/capa via Open Graph — mesma técnica de
 * `scrapePostImages` (fetch + regex sobre o HTML de origem, sem API paga),
 * usada pra importar uma notícia como rascunho na Central de Notícias.
 * Nunca lança exceção — sempre um resultado explícito, mesmo padrão de
 * `scrapePostImages`/`lookupCnpj`.
 */
export async function scrapeNewsMetadata(pageUrl: string): Promise<ScrapeNewsMetadataResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    return { ok: false, error: 'Link inválido.' };
  }
  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    return { ok: false, error: 'Link inválido.' };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(pageUrl);
  } catch (error) {
    logger.warn('Falha ao buscar página para importação de notícia', {
      route: 'scrapeNewsMetadata',
      pageUrl,
      ...(error instanceof Error ? { message: error.message } : {}),
    });
    Sentry.captureMessage('scrapeNewsMetadata: fetch falhou', {
      tags: { route: 'scrapeNewsMetadata' },
      extra: { pageUrl },
    });
    return { ok: false, error: 'Não foi possível acessar esse link. Verifique e tente novamente.' };
  }

  if (!response.ok) {
    return { ok: false, error: `A página respondeu com erro (HTTP ${response.status}).` };
  }

  const html = await response.text();
  const meta = extractOgMetadata(html);

  if (!meta.title) {
    return { ok: false, error: 'Não foi possível encontrar um título nessa página.' };
  }

  return { ok: true, title: meta.title, description: meta.description, image: meta.image };
}
