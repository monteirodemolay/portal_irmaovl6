'use client';

/**
 * Captura um frame do vídeo selecionado (aos 10% da duração, ou 1s se a
 * duração não puder ser lida) usando um `<video>` + `<canvas>` invisíveis
 * no browser — Fase B "Publicação avançada", item "Miniatura automática de
 * vídeo". Retorna `null` em qualquer falha (navegador sem suporte, vídeo
 * corrompido, decodificação demorada demais) — a chamada NUNCA lança, para
 * que o upload do vídeo principal nunca seja bloqueado por causa da
 * miniatura.
 */
export async function captureVideoPosterFrame(file: File): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;

  return new Promise<Blob | null>((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute('src');
      video.load();
    };

    const finish = (result: Blob | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const timeout = setTimeout(() => finish(null), 8000);

    video.onerror = () => {
      clearTimeout(timeout);
      finish(null);
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2;
      const seekTo = Math.min(Math.max(duration * 0.1, 0.1), Math.max(duration - 0.1, 0.1));
      try {
        video.currentTime = seekTo;
      } catch {
        finish(null);
      }
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        const context = canvas.getContext('2d');
        if (!context) {
          finish(null);
          return;
        }
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => finish(blob),
          'image/jpeg',
          0.8,
        );
      } catch {
        finish(null);
      }
    };

    video.src = objectUrl;
  });
}
