import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { generateCriptaKeypair, sealForCripta, openWithCriptaPrivateKey, type CriptaSealedEnvelope } from './cripta-key';
import { splitSecret, combineShares } from './shamir';
import { buildLacreFile, encodeEntries, parseLacreFile } from './lacre-format';

describe('ensaio local de recuperação sem serviços externos', () => {
  it('restaura carta e anexos de três cópias com cada combinação de três guardiões', async () => {
    const pair = await generateCriptaKeypair();
    const shares = splitSecret(pair.privateScalar, 5, 3);
    pair.privateScalar.fill(0);
    const letter = { format: 'vl6-online-letter-v1', recipient: 'Família fictícia', title: 'Ensaio', body: 'Memórias de teste',
      attachments: ['foto', 'audio', 'video'].map((kind) => ({ kind, name: kind, data: Buffer.from(`bytes fictícios: ${kind}`).toString('base64') })) };
    const envelope = await sealForCripta(new TextEncoder().encode(JSON.stringify(letter)), pair.publicKey);
    const bytes = new TextEncoder().encode(JSON.stringify(envelope));
    const archive = buildLacreFile({ formato: 'CRIPTA/2', codigoLacracao: 'VL6-20260929-ABCDEF123456', inventoryDigest: 'a'.repeat(64), totalCartas: 1 },
      encodeEntries([{ kind: 'letter', id: 'test-letter', uid: 'test-owner', bytes, sha256: createHash('sha256').update(bytes).digest('hex') }]));
    for (const copy of [archive.slice(), archive.slice(), archive.slice()]) {
      const parsed = await parseLacreFile(copy);
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 4; b++) for (let c = b + 1; c < 5; c++) {
        const scalar = combineShares([shares[a]!, shares[b]!, shares[c]!]);
        const opened = await openWithCriptaPrivateKey(JSON.parse(new TextDecoder().decode(parsed.entries[0]!.bytes)) as CriptaSealedEnvelope, scalar, pair.publicKey);
        expect(JSON.parse(new TextDecoder().decode(opened))).toEqual(letter);
        scalar.fill(0);
      }
    }
    const insufficient = combineShares(shares.slice(0, 2));
    await expect(openWithCriptaPrivateKey(envelope, insufficient, pair.publicKey)).rejects.toThrow();
  });
});
