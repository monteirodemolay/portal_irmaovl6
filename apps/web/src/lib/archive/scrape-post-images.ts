import 'server-only';
import { logger } from '@vl6/shared';
import * as Sentry from '@sentry/nextjs';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_IMAGES = 60;

// Ícones/logos genéricos do site que nunca são "foto do evento" — filtrados
// pelo próprio nome do arquivo, sem depender de heurística de tamanho (o
// tamanho de exibição não é confiável em imagens responsivas).
const IGNORED_NAME_PATTERNS = [
  /logo/i,
  /favicon/i,
  /icon/i,
  /avatar/i,
  /placeholder/i,
  /sprite/i,
];

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

function stripWixSizeParams(url: string): string {
  // URLs do Wix (static.wixstatic.com) trazem transformações de tamanho no
  // path (ex.: .../v1/fill/w_100,h_100,.../nome.jpg) — a mesma foto em alta
  // resolução geralmente está disponível sem esse segmento, então
  // removemos pra evitar importar a miniatura em vez da imagem original.
  return url.replace(/\/v1\/fill\/[^/]+\//, '/');
}

function isIgnoredImage(url: string): boolean {
  return IGNORED_NAME_PATTERNS.some((pattern) => pattern.test(url));
}

export type ScrapePostImagesResult =
  | { ok: true; images: string[] }
  | { ok: false; error: string };

/**
 * Busca uma página pública (pensada para posts do vl6.com.br) e extrai as
 * URLs de imagem embutidas no HTML — sem nenhuma API paga/autenticada,
 * só `fetch` + regex sobre o markup já renderizado no servidor de origem
 * (padrão usado por geradores de site como Wix, que fazem SSR pra SEO).
 * Nunca lança exceção — sempre um resultado explícito, mesmo padrão de
 * `lookupCnpj` (`apps/web/src/lib/central/cnpj-lookup.ts`).
 */
export async function scrapePostImages(pageUrl: string): Promise<ScrapePostImagesResult> {
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
    logger.warn('Falha ao buscar página para importação de imagens', {
      route: 'scrapePostImages',
      pageUrl,
      ...(error instanceof Error ? { message: error.message } : {}),
    });
    Sentry.captureMessage('scrapePostImages: fetch falhou', {
      tags: { route: 'scrapePostImages' },
      extra: { pageUrl },
    });
    return { ok: false, error: 'Não foi possível acessar esse link. Verifique e tente novamente.' };
  }

  if (!response.ok) {
    return { ok: false, error: `A página respondeu com erro (HTTP ${response.status}).` };
  }

  const html = await response.text();

  const found = new Set<string>();
  // <img src="..."> e <img data-src="..."> (lazy-load) — os dois padrões
  // mais comuns em sites gerados (Wix, WordPress etc.).
  const imgPattern = /<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgPattern.exec(html))) {
    found.add(match[1]!);
  }
  // background-image: url(...) — comum em galerias/carrosséis do Wix.
  const bgPattern = /background-image:\s*url\((?:"|')?([^"')]+)(?:"|')?\)/gi;
  while ((match = bgPattern.exec(html))) {
    found.add(match[1]!);
  }

  const images = [...found]
    .map((src) => {
      try {
        return new URL(src, parsedUrl).toString();
      } catch {
        return null;
      }
    })
    .filter((url): url is string => url !== null)
    .filter((url) => /\.(jpe?g|png|webp)(\?|$)/i.test(url) || url.includes('wixstatic.com'))
    .filter((url) => !isIgnoredImage(url))
    .map(stripWixSizeParams);

  const unique = [...new Set(images)].slice(0, MAX_IMAGES);

  if (unique.length === 0) {
    return { ok: false, error: 'Nenhuma imagem encontrada nessa página.' };
  }
  return { ok: true, images: unique };
}
