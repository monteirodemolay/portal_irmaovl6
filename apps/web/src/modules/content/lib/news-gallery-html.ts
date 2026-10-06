/**
 * Manipulação do bloco `<div data-news-gallery="true">` que guarda as fotos
 * de uma Notícia dentro de `conteudoHtml` — o mesmo formato que o
 * importador (`appendImageGallery`) já grava e que a página pública
 * (`splitNewsGallery`) já lê, então fotos enviadas pelo formulário e fotos
 * importadas convivem na mesma galeria.
 */

const GALLERY_RE = /<div data-news-gallery="true">([\s\S]*?)<\/div>/i;

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function figureFor(url: string): string {
  return '<figure><img src="' + escapeAttribute(url) + '" alt="" loading="lazy" /></figure>';
}

/** Acrescenta fotos à galeria da notícia (cria o bloco se ainda não existir); ignora URLs já presentes. */
export function appendGalleryImages(html: string, urls: string[]): string {
  const fresh = urls.filter(
    (url) => url && !html.includes(url) && !html.includes(escapeAttribute(url)),
  );
  if (fresh.length === 0) return html;

  const figures = fresh.map(figureFor).join('\n');
  const match = GALLERY_RE.exec(html);
  if (match) {
    const inner = (match[1] ?? '').trimEnd();
    return html.replace(
      match[0],
      '<div data-news-gallery="true">' + inner + '\n' + figures + '\n</div>',
    );
  }
  const base = html.trimEnd();
  return (base ? base + '\n' : '') + '<div data-news-gallery="true">\n' + figures + '\n</div>';
}
