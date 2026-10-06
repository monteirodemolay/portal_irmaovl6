import { describe, expect, it } from 'vitest';
import { appendGalleryImages } from './news-gallery-html';

describe('appendGalleryImages', () => {
  it('cria o bloco de galeria quando a notícia ainda não tem', () => {
    const html = appendGalleryImages('<p>Texto</p>', ['https://blob.test/a.jpg']);

    expect(html).toBe(
      '<p>Texto</p>\n<div data-news-gallery="true">\n' +
        '<figure><img src="https://blob.test/a.jpg" alt="" loading="lazy" /></figure>\n</div>',
    );
  });

  it('acrescenta no bloco existente, sem duplicar o bloco', () => {
    const first = appendGalleryImages('<p>Texto</p>', ['https://blob.test/a.jpg']);
    const second = appendGalleryImages(first, ['https://blob.test/b.jpg']);

    expect(second.match(/data-news-gallery/g)).toHaveLength(1);
    expect(second).toContain('https://blob.test/a.jpg');
    expect(second).toContain('https://blob.test/b.jpg');
    expect(second.indexOf('a.jpg')).toBeLessThan(second.indexOf('b.jpg'));
  });

  it('ignora URLs que já estão na notícia', () => {
    const first = appendGalleryImages('', ['https://blob.test/a.jpg']);

    expect(appendGalleryImages(first, ['https://blob.test/a.jpg'])).toBe(first);
  });

  it('escapa aspas e & na URL do atributo', () => {
    const html = appendGalleryImages('', ['https://blob.test/a.jpg?x=1&y="2"']);

    expect(html).toContain('src="https://blob.test/a.jpg?x=1&amp;y=&quot;2&quot;"');
  });

  it('sem URLs devolve o HTML intacto', () => {
    expect(appendGalleryImages('<p>Texto</p>', [])).toBe('<p>Texto</p>');
  });
});
