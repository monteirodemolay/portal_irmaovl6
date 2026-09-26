import JSZip from 'jszip';

type Attachment = { kind: 'foto' | 'audio' | 'video'; name: string; type: string; data: string };
export type LetterForExport = { format: string; title: string; recipient: string; body: string; attachments: Attachment[] };

const escape = (text: string) => text.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char] ?? char);

const extensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg', 'audio/webm': 'webm',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

export async function makeOfflinePackage(letter: LetterForExport): Promise<Blob> {
  if (letter.format !== 'vl6-online-letter-v1' || !Array.isArray(letter.attachments) || letter.attachments.length > 13) {
    throw new Error('Carta inválida para exportação.');
  }
  const zip = new JSZip();
  const manifest: Array<{ path: string; originalName: string; type: string; bytes: number; sha256: string }> = [];
  const gallery: string[] = [];
  for (const [index, item] of letter.attachments.entries()) {
    if (!['foto', 'audio', 'video'].includes(item.kind) || !extensions[item.type] || typeof item.data !== 'string') {
      throw new Error('Formato de anexo não suportado na exportação.');
    }
    const path = `anexos/${item.kind}-${index + 1}.${extensions[item.type]}`;
    const bytes = Uint8Array.from(atob(item.data), (char) => char.charCodeAt(0));
    if (bytes.byteLength > 60_000_000) throw new Error('Anexo acima do limite.');
    zip.file(path, bytes);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    manifest.push({ path, originalName: item.name, type: item.type, bytes: bytes.byteLength,
      sha256: Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('') });
    const label = escape(item.name);
    const src = escape(path);
    gallery.push(`<figure>${item.kind === 'foto' ? `<img src="${src}" alt="${label}">` :
      item.kind === 'audio' ? `<audio controls preload="none" src="${src}"></audio>` :
      `<video controls preload="none" src="${src}"></video>`}
      <figcaption>${label} · <a href="${src}" download>Baixar arquivo</a></figcaption></figure>`);
  }
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(letter.title || 'Minha carta')} · Cripta VL6</title><style>
  *{box-sizing:border-box}body{margin:0;background:#06172e;color:#182c43;font:18px/1.7 Georgia,serif}main{max-width:850px;margin:3rem auto;padding:clamp(1.5rem,6vw,4.5rem);background:#faf3e5;border:2px solid #c9a449;box-shadow:0 18px 60px #0006}small{color:#705622;letter-spacing:.16em;text-transform:uppercase}h1{font-size:clamp(2rem,5vw,3.2rem);line-height:1.15;text-align:center}header{text-align:center;border-bottom:1px solid #bea76e;padding-bottom:1.5rem}article{white-space:pre-wrap;overflow-wrap:anywhere;margin:3rem 0}section{border-top:1px solid #bea76e;padding-top:1rem}figure{margin:1.5rem 0;padding:1rem;background:#fff9ef;border:1px solid #e5d6b5}img,video{display:block;max-width:100%;height:auto;max-height:36rem;margin:auto}audio{width:100%}figcaption{font:16px/1.5 system-ui,sans-serif;margin-top:.75rem;overflow-wrap:anywhere}a{color:#123c69}footer{font:14px/1.5 system-ui,sans-serif;color:#46566a;margin-top:3rem}@media print{body{background:white}main{margin:0;border:0;box-shadow:none}audio,video{display:none}}
  </style></head><body><main><header><small>Cripta do Irmão · Verdadeira Luz nº 06</small><h1>${escape(letter.title || 'Minha carta')}</h1><p>Para ${escape(letter.recipient)}</p></header><article>${escape(letter.body)}</article>${gallery.length ? `<section><h2>Lembranças anexadas</h2>${gallery.join('')}</section>` : ''}<footer>Esta cópia pode ser aberta sem internet. Guarde a pasta de anexos junto deste arquivo.</footer></main></body></html>`;
  zip.file('ABRA_AQUI_A_CARTA.html', html);
  zip.file('manifesto.json', JSON.stringify({ format: 'vl6-offline-letter-v1', createdAt: new Date().toISOString(), files: manifest }, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
