import { describe, expect, it } from 'vitest';
import { filterByTitle, searchLocal, type LocalSearchSource } from './admin-search';

const sources: LocalSearchSource[] = [
  { kind: 'Ferramenta', title: 'Notícias', detail: 'Publicar e revisar', href: '/admin/conteudo/noticias' },
  { kind: 'Ferramenta', title: 'Moderação de comentários', href: '/admin/conteudo/noticias/comentarios', keywords: ['notícias'] },
  { kind: 'Seção do Portal', title: 'Galeria de Honra', href: '/admin/pessoas/irmaos', keywords: ['honrarias'] },
  { kind: 'Ferramenta', title: 'Biblioteca', href: '/admin/acervo/biblioteca' },
];

describe('searchLocal', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(searchLocal(sources, 'NOTICIAS')[0]?.title).toBe('Notícias');
  });

  it('prioriza título sobre sinônimo', () => {
    expect(searchLocal(sources, 'noticias').map((hit) => hit.title)).toEqual([
      'Notícias',
      'Moderação de comentários',
    ]);
  });

  it('encontra pelo sinônimo e leva para a tela que alimenta', () => {
    const [hit] = searchLocal(sources, 'honrarias');
    expect(hit).toMatchObject({ title: 'Galeria de Honra', href: '/admin/pessoas/irmaos' });
  });

  it('devolve vazio para termo em branco ou sem correspondência', () => {
    expect(searchLocal(sources, '  ')).toEqual([]);
    expect(searchLocal(sources, 'zzz')).toEqual([]);
  });

  it('respeita o limite', () => {
    expect(searchLocal(sources, 'a', 2)).toHaveLength(2);
  });
});

describe('filterByTitle', () => {
  it('filtra registros carregados sem reordenar', () => {
    const rows = [{ t: 'Sessão Magna' }, { t: 'Banquete' }, { t: 'Sessão Econômica' }];
    expect(filterByTitle(rows, 'sessao', (r) => r.t).map((r) => r.t)).toEqual([
      'Sessão Magna',
      'Sessão Econômica',
    ]);
  });
});
