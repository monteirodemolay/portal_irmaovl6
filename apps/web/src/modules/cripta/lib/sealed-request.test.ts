import { describe, expect, it } from 'vitest';
import { generateCriptaKeypair, sealForCripta } from './cripta-key';
import { MAX_SEALED_REQUEST_BYTES, sealedRequestId, validateSealedRequest } from './sealed-request';
import { parseOnlineLetter } from './online-letter';

describe('depósito cifrado', () => {
  it('identifica repetição sem compartilhar recibo entre titulares ou lojas', () => {
    const id = sealedRequestId('t1', 'u1', 'ciphertext');
    expect(id).toMatch(/^[a-f0-9-]{36}$/);
    expect(sealedRequestId('t1', 'u1', 'ciphertext')).toBe(id);
    for (const args of [['t2', 'u1', 'ciphertext'], ['t1', 'u2', 'ciphertext'], ['t1', 'u1', 'changed']])
      expect(sealedRequestId(args[0]!, args[1]!, args[2]!)).not.toBe(id);
  });
  it('recusa chave privada, coordenadas falsas, nonce inválido e cifra truncada', async () => {
    const { publicKey } = await generateCriptaKeypair();
    const envelope = await sealForCripta(new TextEncoder().encode('Carta de teste'), publicKey);
    expect(await validateSealedRequest(envelope)).toEqual(envelope);
    for (const invalid of [
      { ...envelope, nonce: 'a' }, { ...envelope, ciphertext: 'a' },
      { ...envelope, ephemeralPublicKey: { ...envelope.ephemeralPublicKey, d: 'private' } },
      { ...envelope, ephemeralPublicKey: { ...envelope.ephemeralPublicKey, x: 'A'.repeat(43), y: 'A'.repeat(43) } },
      { ...envelope, body: 'plaintext' },
    ]) expect(await validateSealedRequest(invalid)).toBeNull();
  });
  it('cabe no transporte com a cota anunciada, texto Unicode e dupla codificação base64', async () => {
    const plain = JSON.stringify({ format: 'vl6-online-letter-v1', title: 'T'.repeat(80), recipient: 'R'.repeat(100),
      body: '語'.repeat(20000), attachments: [{ kind: 'foto', name: 'foto.jpg', type: 'image/jpeg', data: Buffer.alloc(2300000).toString('base64') }] });
    parseOnlineLetter(plain, true, true);
    const { publicKey } = await generateCriptaKeypair();
    const envelope = await sealForCripta(new TextEncoder().encode(plain), publicKey);
    expect(Buffer.byteLength(JSON.stringify(envelope))).toBeLessThan(MAX_SEALED_REQUEST_BYTES);
    expect(await validateSealedRequest(envelope)).not.toBeNull();
  });
});
