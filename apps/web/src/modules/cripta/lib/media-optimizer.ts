/** Browser-side conversions. They reduce size by re-encoding; visual/audio fidelity is never mathematically lossless. */
export type MediaKind = 'foto' | 'audio' | 'video';

const supported = (candidates: string[]) => candidates.find((type) => MediaRecorder.isTypeSupported(type));

export function convertedName(original: string, type: string): string {
  const base = original.replace(/\.[^.]+$/, '').replace(/[^\p{L}\p{N}._ -]/gu, '').slice(0, 90) || 'lembranca';
  return `${base}.${type.startsWith('image/webp') ? 'webp' : type.startsWith('image/jpeg') ? 'jpg' :
    type.startsWith('audio/mp4') ? 'm4a' : type.startsWith('video/mp4') ? 'mp4' : 'webm'}`;
}

async function imageDimensions(file: File): Promise<{ image: ImageBitmap; width: number; height: number }> {
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  return { image, width: image.width, height: image.height };
}

/** Preserve original if it fits; otherwise search quality and dimensions for an acceptable preview. */
export async function optimizePhoto(file: File, budget: number): Promise<File> {
  if (file.size <= budget && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) return file;
  if (budget < 25_000) throw new Error('Esta carta não tem espaço suficiente para outra foto.');
  const { image, width, height } = await imageDimensions(file);
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Este navegador não consegue preparar a foto.');
    const mime = canvas.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
    let best: Blob | null = null;
    for (const edge of [1920, 1600, 1280, 1024, 800, 640, 480]) {
      const scale = Math.min(1, edge / Math.max(width, height));
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.88, 0.78, 0.66, 0.52]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
        if (blob && blob.size <= budget && (!best || blob.size > best.size)) best = blob;
      }
      if (best) break;
    }
    if (!best) throw new Error('A foto não coube nesta carta. Remova outro anexo ou escolha uma foto menor.');
    return new File([best], convertedName(file.name, mime), { type: mime, lastModified: Date.now() });
  } finally { image.close(); }
}

function mediaType(kind: 'audio' | 'video'): string | undefined {
  return supported(kind === 'audio'
    ? ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm']
    : ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4', 'video/webm']);
}

export function recorderOptions(kind: 'audio' | 'video', budget: number, seconds: number): MediaRecorderOptions {
  const mimeType = mediaType(kind);
  if (!mimeType) throw new Error('Este navegador não oferece conversão de áudio/vídeo. Tente enviar um arquivo menor.');
  const totalBits = Math.floor((budget * 8 * 0.82) / Math.max(1, seconds));
  if (totalBits < (kind === 'video' ? 300_000 : 24_000)) {
    throw new Error(kind === 'video'
      ? 'Este vídeo não cabe com qualidade aceitável. Escolha um trecho mais curto ou retire outros anexos.'
      : 'Este áudio não cabe com qualidade aceitável. Grave uma mensagem menor ou retire outros anexos.');
  }
  return kind === 'audio' ? { mimeType, audioBitsPerSecond: Math.min(64_000, totalBits) } : {
    mimeType, audioBitsPerSecond: Math.min(48_000, Math.floor(totalBits * 0.15)),
    videoBitsPerSecond: Math.floor(totalBits * 0.85),
  };
}

/** Record a local media file through the browser's encoder. This runs in real time and preserves an audio track when available. */
export async function optimizeRecording(file: File, kind: 'audio' | 'video', budget: number, duration: number): Promise<File> {
  if (file.size <= budget && ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/webm', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.type)) return file;
  if (typeof MediaRecorder === 'undefined') throw new Error('Conversão indisponível neste navegador. Escolha um arquivo menor.');
  const element = document.createElement(kind);
  const source = URL.createObjectURL(file);
  element.src = source; element.preload = 'auto'; element.muted = true;
  const streamFromElement = element as HTMLMediaElement & { captureStream?: () => MediaStream; webkitCaptureStream?: () => MediaStream };
  let audioContext: AudioContext | undefined;
  let recorder: MediaRecorder | undefined;
  let capture: MediaStream | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      element.onloadedmetadata = () => resolve();
      element.onerror = () => reject(new Error('Não foi possível ler esta mídia.'));
    });
    if (kind === 'audio') {
      audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      audioContext.createMediaElementSource(element).connect(destination);
      capture = destination.stream;
    } else {
      capture = streamFromElement.captureStream?.() ?? streamFromElement.webkitCaptureStream?.();
      if (!capture) throw new Error('Este navegador não consegue converter vídeos importados. Grave pelo site ou escolha um arquivo menor.');
    }
    const options = recorderOptions(kind, budget, duration);
    const chunks: Blob[] = [];
    recorder = new MediaRecorder(capture, options);
    const active = recorder;
    const done = new Promise<Blob>((resolve, reject) => {
      active.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      active.onerror = () => reject(new Error('Falha ao converter a mídia.'));
      active.onstop = () => resolve(new Blob(chunks, { type: active.mimeType.split(';')[0] }));
    });
    const finished = new Promise<void>((resolve, reject) => {
      element.onended = () => resolve();
      element.onerror = () => reject(new Error('Não foi possível concluir a reprodução.'));
    });
    active.start(1000);
    await audioContext?.resume();
    await element.play();
    await finished;
    active.stop();
    const blob = await done;
    if (!blob.size || blob.size > budget) throw new Error('A mídia convertida ainda excede o espaço desta carta. Escolha uma mensagem menor.');
    return new File([blob], convertedName(file.name, blob.type), { type: blob.type, lastModified: Date.now() });
  } finally {
    element.pause();
    if (recorder?.state === 'recording') recorder.stop();
    capture?.getTracks().forEach((track) => track.stop());
    await audioContext?.close();
    URL.revokeObjectURL(source);
  }
}
