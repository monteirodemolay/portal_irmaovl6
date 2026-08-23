'use client';

const MAX_DIMENSION_PX = 2400;
const SIZE_THRESHOLD_BYTES = 3 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

const OPTIMIZABLE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface OptimizeImageResult {
  file: File;
  optimized: boolean;
  originalSize: number;
  optimizedSize: number;
}

/**
 * Redimensiona (maior dimensão > 2400px) e recomprime (JPEG ~0.85) uma
 * imagem no browser via `<canvas>`, ANTES do upload — Fase B "Publicação
 * avançada", item "Compressão/otimização de imagem". Só age quando o
 * arquivo já ultrapassa o limite de dimensão OU o teto de 3 MB; fotos já
 * otimizadas seguem sem alteração, para nunca perder qualidade à toa. Só
 * imagem — documento, áudio e vídeo passam intocados por este util (o
 * chamador decide o que passa aqui).
 *
 * Qualquer falha (`<canvas>`/`toBlob` indisponível, decodificação da
 * imagem corrompida) devolve o arquivo original sem alteração — o upload
 * nunca é bloqueado por causa da otimização.
 */
export async function optimizeImageUpload(file: File): Promise<OptimizeImageResult> {
  const fallback: OptimizeImageResult = {
    file,
    optimized: false,
    originalSize: file.size,
    optimizedSize: file.size,
  };

  if (typeof document === 'undefined') return fallback;
  if (!OPTIMIZABLE_MIME_TYPES.includes(file.type)) return fallback;

  try {
    const bitmap = await createImageBitmapSafe(file);
    if (!bitmap) return fallback;

    const largestSide = Math.max(bitmap.width, bitmap.height);
    const exceedsDimension = largestSide > MAX_DIMENSION_PX;
    const exceedsSize = file.size > SIZE_THRESHOLD_BYTES;
    if (!exceedsDimension && !exceedsSize) {
      closeBitmap(bitmap);
      return fallback;
    }

    const scale = exceedsDimension ? MAX_DIMENSION_PX / largestSide : 1;
    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      closeBitmap(bitmap);
      return fallback;
    }
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    closeBitmap(bitmap);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return fallback;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    const optimizedFile = new File([blob], newName, { type: 'image/jpeg' });

    return {
      file: optimizedFile,
      optimized: true,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
    };
  } catch {
    return fallback;
  }
}

async function createImageBitmapSafe(file: File): Promise<ImageBitmap | null> {
  try {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file);
    }
  } catch {
    // cai no fallback via <img> abaixo
  }
  return new Promise<ImageBitmap | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const bitmap = await createImageBitmap(img);
        resolve(bitmap);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(null);
    };
    img.src = objectUrl;
  });
}

function closeBitmap(bitmap: ImageBitmap): void {
  if (typeof bitmap.close === 'function') bitmap.close();
}
