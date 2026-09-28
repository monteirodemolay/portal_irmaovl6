import { describe, expect, it } from 'vitest';
import { openOnlineCapsule, sealOnlineCapsule } from './online-capsule';

describe('online capsule envelope (zero-knowledge deposit)', () => {
  it('round-trips a letter-sized payload and never exposes plaintext in the envelope', async () => {
    const letter = { format: 'vl6-online-letter-v1', title: 'T', recipient: 'Alguém especial',
      body: 'Um segredo de família que ninguém no servidor deveria ler.', attachments: [] };
    const passphrase = 'uma frase bem longa e exclusiva';
    const envelope = await sealOnlineCapsule(new TextEncoder().encode(JSON.stringify(letter)), passphrase);
    expect(JSON.stringify(envelope)).not.toContain(letter.body);
    expect(JSON.stringify(envelope)).not.toContain(letter.recipient);
    const reopened = JSON.parse(new TextDecoder().decode(
      await openOnlineCapsule(JSON.parse(JSON.stringify(envelope)), passphrase),
    ));
    expect(reopened).toEqual(letter);
  });

  it('rejects the wrong phrase and a tampered ciphertext', async () => {
    const envelope = await sealOnlineCapsule(new TextEncoder().encode('{"a":1}'), 'uma frase bem longa e exclusiva');
    await expect(openOnlineCapsule(envelope, 'outra frase bem longa e diferente')).rejects.toThrow();
    const bytes = Uint8Array.from(atob(envelope.ciphertext), (character) => character.charCodeAt(0));
    bytes[0] = bytes[0]! ^ 1;
    const tampered = { ...envelope, ciphertext: btoa(String.fromCharCode(...bytes)) };
    await expect(openOnlineCapsule(tampered, 'uma frase bem longa e exclusiva')).rejects.toThrow();
  });
});
