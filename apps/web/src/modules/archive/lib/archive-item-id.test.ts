import { describe, expect, it } from 'vitest';
import { archiveItemHref, buildArchiveItemId, parseArchiveItemId } from './archive-item-id';

describe('buildArchiveItemId / parseArchiveItemId', () => {
  it('constrói e faz o round-trip de um ID composto', () => {
    const composite = buildArchiveItemId('file', 'abc123');
    expect(composite).toBe('file_abc123');
    expect(parseArchiveItemId(composite)).toEqual({ kind: 'file', sourceId: 'abc123' });
  });

  it('aceita todos os tipos suportados', () => {
    expect(parseArchiveItemId('library_xyz')).toEqual({ kind: 'library', sourceId: 'xyz' });
    expect(parseArchiveItemId('gallery-album_xyz')).toEqual({
      kind: 'gallery-album',
      sourceId: 'xyz',
    });
    expect(parseArchiveItemId('gallery-media_xyz')).toEqual({
      kind: 'gallery-media',
      sourceId: 'xyz',
    });
  });

  it('rejeita prefixo desconhecido', () => {
    expect(parseArchiveItemId('unknown_xyz')).toBeNull();
  });

  it('rejeita ID sem separador', () => {
    expect(parseArchiveItemId('file')).toBeNull();
  });

  it('rejeita ID sem sourceId', () => {
    expect(parseArchiveItemId('file_')).toBeNull();
  });

  it('preserva IDs de origem que contêm "_" (Firestore não gera, mas o parser não deve truncar)', () => {
    expect(parseArchiveItemId('file_abc_123')).toEqual({ kind: 'file', sourceId: 'abc_123' });
  });

  it('gera o href canônico do Item do Acervo', () => {
    expect(archiveItemHref('gallery-media', 'm1')).toBe('/acervo/item/gallery-media_m1');
  });
});
