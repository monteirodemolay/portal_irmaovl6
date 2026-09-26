import { afterEach, describe, expect, it, vi } from 'vitest';
import { convertedName, recorderOptions } from './media-optimizer';

afterEach(() => vi.unstubAllGlobals());

describe('preparo de mídias', () => {
  it('usa extensão correspondente ao arquivo gerado', () => {
    expect(convertedName('retrato original.heic', 'image/webp')).toBe('retrato original.webp');
    expect(convertedName('voz.wav', 'audio/mp4')).toBe('voz.m4a');
  });

  it('rejeita vídeo que exigiria compressão excessiva e limita a taxa de bits', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: (mime: string) => mime === 'video/webm' });
    expect(() => recorderOptions('video', 650_000, 60)).toThrow('qualidade aceitável');
    const options = recorderOptions('video', 2_500_000, 45);
    expect(options.videoBitsPerSecond).toBeGreaterThanOrEqual(300_000);
    expect(options.mimeType).toBe('video/webm');
  });
});
