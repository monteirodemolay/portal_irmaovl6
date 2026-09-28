import { describe, expect, it } from 'vitest';
import { isConstellationVisualMedia } from './constellation-media-eligibility';

const base = {
  mediaType: 'foto' as 'foto' | 'video' | 'audio' | 'documento',
  publicacaoStatus: 'publicado' as 'publicado' | 'rascunho' | 'oculto' | 'arquivado',
  deletedAt: null as Date | null,
  mediaAssetId: 'asset-1',
};

describe('isConstellationVisualMedia', () => {
  it('inclui fotos e vídeos publicados', () => {
    expect(isConstellationVisualMedia(base)).toBe(true);
    expect(isConstellationVisualMedia({ ...base, mediaType: 'video' })).toBe(true);
  });

  it('exclui áudio, documento, rascunho, ocultação, exclusão e arquivo inexistente', () => {
    expect(isConstellationVisualMedia({ ...base, mediaType: 'documento' })).toBe(false);
    expect(isConstellationVisualMedia({ ...base, mediaType: 'audio' })).toBe(false);
    expect(isConstellationVisualMedia({ ...base, publicacaoStatus: 'rascunho' })).toBe(false);
    expect(isConstellationVisualMedia({ ...base, publicacaoStatus: 'oculto' })).toBe(false);
    expect(isConstellationVisualMedia({ ...base, deletedAt: new Date() })).toBe(false);
    expect(isConstellationVisualMedia({ ...base, mediaAssetId: '' })).toBe(false);
    expect(isConstellationVisualMedia({ ...base, mediaAssetId: '   ' })).toBe(false);
  });
});
