import { describe, expect, it } from 'vitest';
import { generateCriptaKeypair, openWithCriptaPrivateKey, sealForCripta } from './cripta-key';
import { combineShares, splitSecret } from './shamir';

describe('Cripta keypair + hybrid seal (no member passphrase)', () => {
  it('anyone with only the public key can seal; only a reconstructed private key can open', async () => {
    const { publicKey, privateScalar } = await generateCriptaKeypair();
    const plaintext = new TextEncoder().encode(JSON.stringify({ title: 'Carta', body: 'Segredo de família', recipient: 'Alguém' }));

    const envelope = await sealForCripta(plaintext, publicKey);
    expect(JSON.stringify(envelope)).not.toContain('Segredo de família');

    const opened = await openWithCriptaPrivateKey(envelope, privateScalar, publicKey);
    expect(new TextDecoder().decode(opened)).toBe(new TextDecoder().decode(plaintext));
  });

  it('full ceremony: split the private key among 5 guardiões, reconstruct from any 3, decrypt a letter sealed earlier', async () => {
    const { publicKey, privateScalar } = await generateCriptaKeypair();
    const shares = splitSecret(privateScalar, 5, 3);
    expect(shares).toHaveLength(5);

    // Letters get sealed using only the public key — no guardian involved at deposit time.
    const letter = new TextEncoder().encode(JSON.stringify({ title: 'Para meu filho', body: 'Conteúdo real da carta.', recipient: 'Filho' }));
    const envelope = await sealForCripta(letter, publicKey);

    // Later, 3 of the 5 guardiões convene and reconstruct the key — a different 3 each time.
    for (const combo of [[0, 1, 2], [0, 2, 4], [1, 3, 4]]) {
      const reconstructed = combineShares(combo.map((index) => shares[index]!));
      expect(reconstructed).toEqual(privateScalar);
      const opened = await openWithCriptaPrivateKey(envelope, reconstructed, publicKey);
      expect(JSON.parse(new TextDecoder().decode(opened))).toEqual({ title: 'Para meu filho', body: 'Conteúdo real da carta.', recipient: 'Filho' });
    }
  });

  it('rejects a tampered ciphertext and a wrong private key', async () => {
    const { publicKey, privateScalar } = await generateCriptaKeypair();
    const other = await generateCriptaKeypair();
    const envelope = await sealForCripta(new TextEncoder().encode('conteúdo'), publicKey);

    await expect(openWithCriptaPrivateKey(envelope, other.privateScalar, publicKey)).rejects.toThrow();

    const bytes = Uint8Array.from(atob(envelope.ciphertext.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    bytes[0] = bytes[0]! ^ 1;
    let flipped = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    await expect(openWithCriptaPrivateKey({ ...envelope, ciphertext: flipped }, privateScalar, publicKey)).rejects.toThrow();
    void flipped;
  });

  it('two different letters from the same public key produce unlinkable ciphertexts (fresh ephemeral key each time)', async () => {
    const { publicKey } = await generateCriptaKeypair();
    const a = await sealForCripta(new TextEncoder().encode('mesma carta'), publicKey);
    const b = await sealForCripta(new TextEncoder().encode('mesma carta'), publicKey);
    expect(a.ephemeralPublicKey.x).not.toBe(b.ephemeralPublicKey.x);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});
