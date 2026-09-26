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
  *{box-sizing:border-box}body{margin:0;background:#091e38;color:#352b20;font:18px/1.8 Georgia,serif;padding:1rem}main{position:relative;max-width:850px;margin:3rem auto;padding:clamp(1.5rem,6vw,4.5rem);background:radial-gradient(ellipse at 12% 8%,#ffffffc9,transparent 42%),radial-gradient(ellipse at 88% 94%,#a173332b,transparent 42%),repeating-linear-gradient(0deg,#77562306 0,#77562306 1px,transparent 1px,transparent 4px),linear-gradient(110deg,#e8d5a9,#fbf3d9 9%,#fff9e9 48%,#f8eccd 90%,#dfc796);border:1px solid #aa8747;box-shadow:0 3px 0 #b3945a,0 20px 55px #0005,inset 0 0 45px #97713e25}main:before{content:"";position:absolute;inset:12px;border:1px solid #855e268c;box-shadow:inset 0 0 0 5px #fffae68c,inset 0 0 0 6px #855e2640;pointer-events:none}small{font:600 11px/1.5 system-ui,sans-serif;color:#76552b;letter-spacing:.24em;text-transform:uppercase}header{text-align:center}.ornament{color:#a17b3e;font-size:1.4rem;letter-spacing:.4em;margin:1rem 0 .7rem}h1{font-weight:normal;font-size:clamp(2rem,5vw,3.3rem);line-height:1.12;overflow-wrap:anywhere}header p:last-child{font-style:italic;color:#75542e;overflow-wrap:anywhere}.rule{width:min(240px,65%);height:1px;background:linear-gradient(90deg,transparent,#a48143,transparent);margin:2rem auto}article{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.95}section{border-top:1px solid #b39157;margin-top:3rem;padding-top:2rem}h2{font-weight:normal;text-align:center;font-size:1.45rem}figure{margin:1.5rem 0;padding:.75rem;background:#fffaf0a8;border:1px solid #d8bf8f}img,video{display:block;max-width:100%;height:auto;max-height:35rem;margin:auto}audio{width:100%}figcaption{font:14px/1.5 system-ui,sans-serif;margin-top:.75rem;overflow-wrap:anywhere}a{color:#123c69}footer{font:12px/1.6 system-ui,sans-serif;color:#795b36;text-align:center;letter-spacing:.12em;margin-top:3rem}@media(max-width:540px){body{padding:0}main{margin:0}main:before{inset:7px}}@media print{body{background:white;padding:0}main{margin:0;border:0;box-shadow:none;print-color-adjust:exact}audio,video{display:none}}
  </style></head><body><main><header><small>Verdadeira Luz nº 06 · Cripta do Irmão</small><p class="ornament" aria-hidden="true">❧ ✦ ❧</p><h1>${escape(letter.title || 'Minha carta')}</h1><p>Para ${escape(letter.recipient)}</p></header><div class="rule" aria-hidden="true"></div><article>${escape(letter.body)}</article>${gallery.length ? `<section><h2>Lembranças que acompanham esta carta</h2>${gallery.join('')}</section>` : ''}<footer>Uma mensagem para guardar através do tempo.<br>Esta cópia pode ser aberta sem internet. Guarde a pasta de anexos junto deste arquivo.</footer></main></body></html>`;
  zip.file('ABRA_AQUI_A_CARTA.html', html);
  zip.file('manifesto.json', JSON.stringify({ format: 'vl6-offline-letter-v1', createdAt: new Date().toISOString(), files: manifest }, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
}
