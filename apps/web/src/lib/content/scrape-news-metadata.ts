import 'server-only';
import { logger } from '@vl6/shared';
import * as Sentry from '@sentry/nextjs';
import { extractOgMetadata } from '@/modules/content/lib/extract-og-metadata';

const FETCH_TIMEOUT_MS = 15_000;
const ALLOWED_HOSTS = new Set(['vl6.com.br', 'www.vl6.com.br']);

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    mdash: '—',
    ndash: '–',
    hellip: '…',
  };

  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => named[name] ?? match);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function textToHtml(value: string): string {
  return normalizeWhitespace(decodeHtmlEntities(value))
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

function absoluteUrl(value: string, baseUrl: string): string | null {
  try {
    const url = new URL(decodeHtmlEntities(value), baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

function findArticleJsonLd(html: string): Record<string, unknown> | null {
  for (const match of html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const raw = match[1]?.trim();
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as unknown;
      const stack: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (stack.length > 0) {
        const item = stack.shift();
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;

        const record = item as Record<string, unknown>;
        const type = record['@type'];
        const types = Array.isArray(type) ? type : [type];
        if (
          types.some(
            (candidate) =>
              candidate === 'Article' ||
              candidate === 'NewsArticle' ||
              candidate === 'BlogPosting',
          )
        ) {
          return record;
        }

        const graph = record['@graph'];
        if (Array.isArray(graph)) stack.push(...graph);
      }
    } catch {
      // Alguns CMSs podem emitir blocos JSON-LD inválidos; tenta o próximo.
    }
  }

  return null;
}

function extractJsonLdImage(article: Record<string, unknown> | null, baseUrl: string): string | null {
  if (!article) return null;
  const value = article.image;
  const candidates = Array.isArray(value) ? value : [value];

  for (const candidate of candidates) {
    if (typeof candidate === 'string') {
      const url = absoluteUrl(candidate, baseUrl);
      if (url) return url;
    }
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      const urlValue = (candidate as Record<string, unknown>).url;
      if (typeof urlValue === 'string') {
        const url = absoluteUrl(urlValue, baseUrl);
        if (url) return url;
      }
    }
  }

  return null;
}

function extractArticleBodyHtml(
  html: string,
  article: Record<string, unknown> | null,
): string | null {
  if (article && typeof article.articleBody === 'string' && article.articleBody.trim()) {
    const body = article.articleBody.trim();
    return /<\/?[a-z][\s\S]*>/i.test(body) ? body : textToHtml(body);
  }

  const candidates = [
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<main\b[^>]*>([\s\S]*?)<\/main>/i,
  ];

  for (const regex of candidates) {
    const match = html.match(regex);
    if (match?.[1] && match[1].replace(/<[^>]+>/g, '').trim().length > 120) {
      return match[1];
    }
  }

  return null;
}

function sanitizeImportedHtml(source: string, baseUrl: string): string {
  let html = source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /<(script|style|noscript|svg|canvas|iframe|form|button|input|select|textarea|nav|header|footer|aside)\b[\s\S]*?<\/\1>/gi,
      '',
    )
    .replace(/<(script|style|noscript|svg|canvas|iframe|form|button|input|select|textarea)\b[^>]*\/?\s*>/gi, '');

  html = html.replace(
    /<img\b([^>]*?)\bsrc\s*=\s*(["'])(.*?)\2([^>]*)>/gi,
    (_full, before: string, _quote: string, src: string, after: string) => {
      const normalized = absoluteUrl(src, baseUrl);
      if (!normalized) return '';
      const altMatch = `${before} ${after}`.match(/\balt\s*=\s*(["'])(.*?)\1/i);
      const alt = altMatch?.[2] ? decodeHtmlEntities(altMatch[2]) : '';
      return `<img src="${escapeHtml(normalized)}" alt="${escapeHtml(alt)}" loading="lazy" />`;
    },
  );

  html = html.replace(
    /<a\b([^>]*?)\bhref\s*=\s*(["'])(.*?)\2([^>]*)>/gi,
    (_full, _before: string, _quote: string, href: string) => {
      const normalized = absoluteUrl(href, baseUrl);
      if (!normalized) return '<a>';
      return `<a href="${escapeHtml(normalized)}" target="_blank" rel="noopener noreferrer">`;
    },
  );

  html = html
    .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, '')
    .replace(/\sstyle\s*=\s*(["']).*?\1/gi, '')
    .replace(/\sclass\s*=\s*(["']).*?\1/gi, '')
    .replace(/\sid\s*=\s*(["']).*?\1/gi, '')
    .replace(/\sdata-[a-z0-9_-]+\s*=\s*(["']).*?\1/gi, '');

  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    's',
    'blockquote',
    'h2',
    'h3',
    'h4',
    'ul',
    'ol',
    'li',
    'figure',
    'figcaption',
    'img',
    'a',
    'span',
    'div',
  ]);

  html = html.replace(/<\/?([a-z0-9-]+)\b[^>]*>/gi, (tag, name: string) =>
    allowedTags.has(name.toLowerCase()) ? tag : '',
  );

  return normalizeWhitespace(html);
}

function extractAllImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();

  for (const match of html.matchAll(/<img\b[^>]*(?:src|data-src)\s*=\s*(["'])(.*?)\1/gi)) {
    const value = match[2];
    if (!value) continue;
    const normalized = absoluteUrl(value, baseUrl);
    if (!normalized) continue;

    const lower = normalized.toLowerCase();
    if (
      lower.includes('logo') ||
      lower.includes('favicon') ||
      lower.includes('icon') ||
      lower.includes('avatar') ||
      lower.includes('placeholder') ||
      lower.includes('sprite')
    ) {
      continue;
    }
    urls.add(normalized);
  }

  for (const match of html.matchAll(/background-image:\s*url\((?:"|')?([^"')]+)(?:"|')?\)/gi)) {
    const value = match[1];
    if (!value) continue;
    const normalized = absoluteUrl(value, baseUrl);
    if (!normalized) continue;
    const lower = normalized.toLowerCase();
    if (
      lower.includes('logo') ||
      lower.includes('favicon') ||
      lower.includes('icon') ||
      lower.includes('avatar') ||
      lower.includes('placeholder') ||
      lower.includes('sprite')
    ) {
      continue;
    }
    urls.add(normalized);
  }

  return [...urls]
    .filter((url) => /\.(jpe?g|png|webp)(\?|$)/i.test(url) || url.includes('wixstatic.com'))
    .slice(0, 40);
}

function appendMissingImages(contentHtml: string, images: string[]): string {
  const missing = images.filter((url) => !contentHtml.includes(url));
  if (missing.length === 0) return contentHtml;

  const gallery = missing
    .map(
      (url) =>
        `<figure><img src="${escapeHtml(url)}" alt="" loading="lazy" /></figure>`,
    )
    .join('\n');

  return `${contentHtml}\n${gallery}`;
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PortalVL6/2.0; +https://portal.vl6.com.br)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export type ScrapeNewsMetadataResult =
  | {
      ok: true;
      title: string;
      description: string | null;
      image: string | null;
      contentHtml: string;
      images: string[];
      /** Data de publicação original, priorizando JSON-LD e depois Open Graph. */
      publishedAt: Date | null;
    }
  | { ok: false; error: string };

/**
 * Importa conteúdo do site institucional da VL6.
 *
 * A origem é deliberadamente restrita a vl6.com.br para evitar SSRF. Primeiro
 * tenta o JSON-LD de Article/NewsArticle/BlogPosting (que normalmente contém o
 * corpo completo do post no Wix); depois usa article/main renderizado como
 * fallback. Todas as imagens encontradas são normalizadas para URL absoluta e
 * anexadas ao HTML quando não estavam no corpo extraído.
 */
export async function scrapeNewsMetadata(pageUrl: string): Promise<ScrapeNewsMetadataResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(pageUrl);
  } catch {
    return { ok: false, error: 'Link inválido.' };
  }

  if (
    parsedUrl.protocol !== 'https:' ||
    !ALLOWED_HOSTS.has(parsedUrl.hostname.toLowerCase())
  ) {
    return { ok: false, error: 'Informe um link de notícia do site vl6.com.br.' };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(parsedUrl.toString());
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
  const article = findArticleJsonLd(html);

  const title =
    (typeof article?.headline === 'string' ? decodeHtmlEntities(article.headline) : null) ??
    meta.title;

  if (!title) {
    return { ok: false, error: 'Não foi possível encontrar um título nessa página.' };
  }

  const description =
    (typeof article?.description === 'string'
      ? decodeHtmlEntities(article.description)
      : null) ?? meta.description;

  const publishedRaw =
    (typeof article?.datePublished === 'string' ? article.datePublished : null) ??
    meta.publishedAt;
  const publishedAt = publishedRaw ? new Date(publishedRaw) : null;

  const articleBody = extractArticleBodyHtml(html, article);
  const images = extractAllImages(html, parsedUrl.toString());
  const cover =
    extractJsonLdImage(article, parsedUrl.toString()) ??
    (meta.image ? absoluteUrl(meta.image, parsedUrl.toString()) : null) ??
    images[0] ??
    null;

  let contentHtml = articleBody
    ? sanitizeImportedHtml(articleBody, parsedUrl.toString())
    : description
      ? `<p>${escapeHtml(description)}</p>`
      : '';

  contentHtml = appendMissingImages(contentHtml, images);

  if (!contentHtml.trim()) {
    return {
      ok: false,
      error:
        'A página foi encontrada, mas o corpo da notícia não pôde ser extraído. Tente novamente mais tarde.',
    };
  }

  return {
    ok: true,
    title: title.trim(),
    description: description?.trim() || null,
    image: cover,
    contentHtml,
    images,
    publishedAt: publishedAt && !Number.isNaN(publishedAt.getTime()) ? publishedAt : null,
  };
}
