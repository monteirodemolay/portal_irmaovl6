export type OnlineLetter = {
  format: 'vl6-online-letter-v1';
  title: string;
  recipient: string;
  body: string;
  attachments: Array<{ kind: 'foto' | 'audio' | 'video'; name: string; type: string; data: string }>;
};

export function parseOnlineLetter(body: string, requireComplete: boolean): OnlineLetter {
  if (Buffer.byteLength(body) > 1_000_000) throw new Error('Carta acima do limite atual.');
  const value = JSON.parse(body) as OnlineLetter;
  if (value?.format !== 'vl6-online-letter-v1' || typeof value.title !== 'string' ||
      typeof value.recipient !== 'string' || typeof value.body !== 'string' ||
      !Array.isArray(value.attachments) || value.attachments.length > 13 ||
      value.title.length > 80 || value.recipient.length > 100 || value.body.length > 20_000 ||
      (requireComplete && (!value.recipient.trim() || !value.body.trim()))) throw new Error('Carta inválida.');
  const count = { foto: 0, audio: 0, video: 0 };
  let attachmentBytes = 0;
  for (const item of value.attachments) {
    if (!item || !['foto', 'audio', 'video'].includes(item.kind) ||
        typeof item.name !== 'string' || item.name.length > 120 ||
      typeof item.type !== 'string' || item.type.length > 100 ||
      typeof item.data !== 'string' || item.data.length > 900_000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(item.data) ||
      Buffer.from(item.data, 'base64').toString('base64') !== item.data ||
      !item.type.startsWith(item.kind === 'foto' ? 'image/' : `${item.kind}/`)) {
      throw new Error('Anexo inválido.');
    }
    count[item.kind]++;
    attachmentBytes += Buffer.byteLength(item.data, 'base64');
  }
  if (count.foto > 10 || count.audio > 2 || count.video > 1 || attachmentBytes > 650_000) {
    throw new Error('Anexos acima do limite atual.');
  }
  return value;
}
