const NAMED_ENTITIES: Record<string, string> = {
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

/** Decodificador mínimo — só o suficiente pra texto de `<meta>`/`<title>` (entidades nomeadas comuns + numéricas), sem puxar uma lib de parsing HTML inteira pra isso. */
function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match);
}

/**
 * Extrai metadados Open Graph (`og:title`, `og:description`, `og:image`,
 * `article:published_time`) do HTML de uma página, com `<title>` como
 * reserva pro título quando não há `og:title` — usado pra importar notícias
 * do site institucional (vl6.com.br) sem depender de um scraper específico
 * pra sua estrutura (WordPress e praticamente todo CMS emitem essas tags
 * padrão pra pré-visualização em redes sociais).
 */
export interface ExtractedPageMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  publishedAt: string | null;
}

function parseMetaTags(html: string): Map<string, string> {
  const tags = new Map<string, string>();
  for (const tagMatch of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = tagMatch[0];
    let key: string | null = null;
    let content: string | null = null;
    for (const attrMatch of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*"([^"]*)"|([a-zA-Z:_-]+)\s*=\s*'([^']*)'/g)) {
      const name = (attrMatch[1] ?? attrMatch[3])?.toLowerCase();
      const value = attrMatch[2] ?? attrMatch[4] ?? '';
      if (name === 'property' || name === 'name') key = value.toLowerCase();
      if (name === 'content') content = value;
    }
    if (key && content !== null) tags.set(key, decodeHtmlEntities(content));
  }
  return tags;
}

export function extractOgMetadata(html: string): ExtractedPageMetadata {
  const meta = parseMetaTags(html);
  const titleTagMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);

  return {
    title: meta.get('og:title') ?? (titleTagMatch ? decodeHtmlEntities(titleTagMatch[1]!.trim()) : null),
    description: meta.get('og:description') ?? meta.get('description') ?? null,
    image: meta.get('og:image') ?? null,
    publishedAt: meta.get('article:published_time') ?? null,
  };
}
