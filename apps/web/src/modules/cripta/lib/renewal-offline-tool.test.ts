import { describe, expect, it } from 'vitest';
import { generateCriptaKeypair, sealForCripta } from './cripta-key';
import { buildLacreFile, encodeEntries, type LacreEntry } from './lacre-format';

/** Exercises the real Renovação functions the offline tool bundles (scripts/cripta/abertura-
 * offline/entry.ts) — imported directly here, not through esbuild, since they're plain
 * isomorphic TypeScript. Proves a Renovação actually re-seals every letter under a brand new
 * key (openable only with the NEW key, never the old one), carries drafts through untouched,
 * and produces a .lacre any existing reader (parseLacreFile, the Conferência física tools)
 * still accepts unmodified. */
import {
  buildRenewedLacre,
  generateRenewedKey,
  parseEligibleMembers,
  reencryptAllLetters,
} from '../../../../../../scripts/cripta/abertura-offline/entry';
import { parseLacreFile } from './lacre-format';

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('reencryptAllLetters', () => {
  it('resela cada carta sob a chave nova e deixa rascunhos intactos', async () => {
    const { publicKey: oldPublicKey, privateScalar: oldScalar } = await generateCriptaKeypair();
    const letterPlain = new TextEncoder().encode(
      JSON.stringify({ format: 'vl6-online-letter-v1', title: 'T', recipient: 'R', body: 'B', attachments: [] }),
    );
    const sealedOld = await sealForCripta(letterPlain, oldPublicKey);
    const letterBytes = new TextEncoder().encode(JSON.stringify(sealedOld));
    const draftBytes = new TextEncoder().encode('rascunho-inalterado');
    const entries: LacreEntry[] = [
      { kind: 'letter', id: 'carta-1', uid: 'uid-1', sha256: await sha256Hex(letterBytes), bytes: letterBytes },
      { kind: 'draft', id: 'uid-2', uid: 'uid-2', sha256: await sha256Hex(draftBytes), bytes: draftBytes },
    ];

    const { publicKey: newPublicKey, privateScalar: newScalar } = await generateCriptaKeypair();
    const outcome = await reencryptAllLetters(entries, oldScalar, oldPublicKey, newPublicKey);

    expect(outcome.failed).toEqual([]);
    expect(outcome.entries).toHaveLength(2);
    const renewedDraft = outcome.entries.find((entry) => entry.kind === 'draft')!;
    expect(renewedDraft.bytes).toEqual(draftBytes);

    const renewedLetter = outcome.entries.find((entry) => entry.kind === 'letter')!;
    expect(renewedLetter.bytes).not.toEqual(letterBytes);
    expect(await sha256Hex(renewedLetter.bytes)).toBe(renewedLetter.sha256);

    const { openWithCriptaPrivateKey } = await import('./cripta-key');
    const reopened = JSON.parse(
      new TextDecoder().decode(
        await openWithCriptaPrivateKey(
          JSON.parse(new TextDecoder().decode(renewedLetter.bytes)),
          newScalar,
          newPublicKey,
        ),
      ),
    );
    expect(reopened.recipient).toBe('R');

    await expect(
      openWithCriptaPrivateKey(JSON.parse(new TextDecoder().decode(renewedLetter.bytes)), oldScalar, oldPublicKey),
    ).rejects.toThrow();
  });

  it('reporta falha por carta sem gerar entradas parciais para ela', async () => {
    const { publicKey: oldPublicKey, privateScalar: oldScalar } = await generateCriptaKeypair();
    const { publicKey: unrelatedPublicKey } = await generateCriptaKeypair();
    const sealedWithWrongKey = await sealForCripta(new TextEncoder().encode('{}'), unrelatedPublicKey);
    const bytes = new TextEncoder().encode(JSON.stringify(sealedWithWrongKey));
    const entries: LacreEntry[] = [{ kind: 'letter', id: 'carta-ruim', uid: 'uid-1', sha256: await sha256Hex(bytes), bytes }];

    const { publicKey: newPublicKey } = await generateCriptaKeypair();
    const outcome = await reencryptAllLetters(entries, oldScalar, oldPublicKey, newPublicKey);

    expect(outcome.entries).toEqual([]);
    expect(outcome.failed).toEqual([{ id: 'carta-ruim', error: expect.any(String) }]);
  });
});

describe('generateRenewedKey', () => {
  it('gera uma chave independente da antiga, com 5 partes e limiar 3', async () => {
    const { publicKey: oldPublicKey } = await generateCriptaKeypair();
    const generated = await generateRenewedKey(5, 3);
    expect(generated.shares).toHaveLength(5);
    expect(generated.publicKey).not.toEqual(oldPublicKey);
    const { combineShares } = await import('./shamir');
    const { openWithCriptaPrivateKey } = await import('./cripta-key');
    const scalar = combineShares(generated.shares.slice(0, 3));
    const sealed = await sealForCripta(new TextEncoder().encode('ok'), generated.publicKey);
    const opened = await openWithCriptaPrivateKey(sealed, scalar, generated.publicKey);
    expect(new TextDecoder().decode(opened)).toBe('ok');
  });
});

describe('buildRenewedLacre', () => {
  it('produz um .lacre que o leitor normal (parseLacreFile) aceita sem mudanças', async () => {
    const bytes = new TextEncoder().encode('conteudo');
    const entries: LacreEntry[] = [{ kind: 'letter', id: 'c1', uid: 'u1', sha256: await sha256Hex(bytes), bytes }];
    const renewed = await buildRenewedLacre(entries);
    expect(renewed.code).toMatch(/^VL6-\d{8}-[0-9A-F]{12}$/);
    expect(renewed.letters).toBe(1);
    expect(renewed.drafts).toBe(0);

    const parsed = await parseLacreFile(renewed.bytes);
    expect(parsed.header.codigoLacracao).toBe(renewed.code);
    expect(parsed.header.inventoryDigest).toBe(renewed.inventoryDigest);
    expect(parsed.header.totalCartas).toBe(1);
    expect(parsed.entries).toHaveLength(1);
  });

  it('é consistente com um .lacre construído pela via normal de exportação', async () => {
    const bytes = new TextEncoder().encode('x');
    const entries: LacreEntry[] = [{ kind: 'draft', id: 'd1', uid: 'u1', sha256: await sha256Hex(bytes), bytes }];
    const renewed = await buildRenewedLacre(entries);
    const manual = buildLacreFile(
      { formato: 'CRIPTA/2', codigoLacracao: renewed.code, inventoryDigest: renewed.inventoryDigest, totalCartas: 0 },
      encodeEntries(entries),
    );
    expect(renewed.bytes).toEqual(manual);
  });
});

describe('parseEligibleMembers', () => {
  it('lê a lista exportada pelo Portal', () => {
    const members = parseEligibleMembers({
      format: 'vl6-cripta-eligible-members-v1',
      generatedAt: '2027-01-01T00:00:00.000Z',
      members: [{ id: 'm1', nome: 'Fulano' }, { id: 'm2', nome: 'Beltrano' }],
    });
    expect(members).toEqual([{ id: 'm1', nome: 'Fulano' }, { id: 'm2', nome: 'Beltrano' }]);
  });

  it('rejeita formato desconhecido ou registro inválido', () => {
    expect(() => parseEligibleMembers({ format: 'outra-coisa', members: [] })).toThrow();
    expect(() => parseEligibleMembers({ format: 'vl6-cripta-eligible-members-v1', members: [{ id: 'm1' }] })).toThrow();
  });
});
