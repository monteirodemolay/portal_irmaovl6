import { describe, expect, it } from 'vitest';
import { decodeLetter, encodeLetter, openCapsule, sealCapsule } from './sealed-capsule';

describe('portable letter envelope', () => {
  it('opens on another call with the correct phrase, without storing the phrase', async () => {
    const letter = { title: 'Exemplo', body: 'Carta fictícia', recipient: 'Destinatário fictício' };
    const envelope = await sealCapsule(encodeLetter(letter), 'uma frase longa exclusiva para ensaio');
    expect(JSON.stringify(envelope)).not.toContain(letter.body);
    expect(decodeLetter(await openCapsule(JSON.parse(JSON.stringify(envelope)), 'uma frase longa exclusiva para ensaio'))).toEqual(letter);
  });

  it('rejects the wrong phrase and modified ciphertext', async () => {
    const envelope = await sealCapsule(encodeLetter({ title: 'T', body: 'B', recipient: 'R' }), 'uma frase longa exclusiva para ensaio');
    await expect(openCapsule(envelope, 'outra frase longa para o mesmo ensaio')).rejects.toThrow();
    const bytes = Uint8Array.from(atob(envelope.ciphertext), (character) => character.charCodeAt(0));
    bytes[0] = bytes[0]! ^ 1;
    const tampered = { ...envelope, ciphertext: btoa(String.fromCharCode(...bytes)) };
    await expect(openCapsule(tampered, 'uma frase longa exclusiva para ensaio')).rejects.toThrow();
  });
});
