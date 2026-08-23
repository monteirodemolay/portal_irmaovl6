/**
 * Normaliza um texto livre (título do evento, legenda de mídia) para um
 * nome de arquivo seguro em qualquer sistema operacional — usado pelos
 * exportadores de ZIP e PDF do álbum de evento (Fase D). Remove acentos,
 * troca separadores por hífen e descarta caracteres reservados do Windows/
 * Unix (`\/:*?"<>|`).
 */
export function sanitizeExportFilename(raw: string, fallback: string): string {
  const normalized = raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  return normalized.length > 0 ? normalized.slice(0, 120) : fallback;
}
