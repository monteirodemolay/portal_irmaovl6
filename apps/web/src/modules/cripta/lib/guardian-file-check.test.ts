import { describe, expect, it } from 'vitest';
import { generateCriptaKeypair } from './cripta-key';
import { splitSecret } from './shamir';
import {
  checkGuardianFile,
  guardianShareDigest,
  validGuardianDigests,
} from './guardian-file-check';

async function fixture() {
  const { publicKey, privateScalar } = await generateCriptaKeypair();
  const shares = splitSecret(privateScalar, 5, 3);
  privateScalar.fill(0);
  const reference = {
    publicKey,
    totalGuardians: 5,
    threshold: 3,
    guardianShareDigests: await Promise.all(
      shares.map((share) => guardianShareDigest(share, publicKey, 5, 3)),
    ),
    guardians: shares.map((_, i) => ({ name: `Guardião ${i + 1}`, status: 'valida' as const })),
  };
  const file = {
    format: 'vl6-cripta-guardian-share-v1',
    parte: 1,
    totalPartes: 5,
    limiar: 3,
    valor: btoa(String.fromCharCode(...shares[0]!.y)),
    chavePublicaCripta: publicKey,
  };
  return { file, reference };
}
describe('conferência individual de parte', () => {
  it('confirma uma única parte por referência registrada, independentemente da formatação', async () => {
    const { file, reference } = await fixture();
    expect(await checkGuardianFile(JSON.stringify(file, null, 4), reference)).toMatchObject({
      integrity: 'confirmed',
      part: 1,
      compromised: false,
    });
  });
  it('detecta alteração de um byte do segredo mesmo mantendo JSON válido', async () => {
    const { file, reference } = await fixture();
    const bytes = Uint8Array.from(atob(file.valor), (c) => c.charCodeAt(0));
    bytes[0] = bytes[0]! ^ 1;
    file.valor = btoa(String.fromCharCode(...bytes));
    await expect(checkGuardianFile(JSON.stringify(file), reference)).rejects.toThrow('difere');
  });
  it('não declara íntegra uma parte antiga sem referência', async () => {
    const { file, reference } = await fixture();
    reference.guardianShareDigests = [];
    expect((await checkGuardianFile(JSON.stringify(file), reference)).integrity).toBe(
      'unconfirmed',
    );
  });
  it('rejeita parte de outra chave ou índice trocado', async () => {
    const { file, reference } = await fixture();
    await expect(
      checkGuardianFile(JSON.stringify({ ...file, parte: 2 }), reference),
    ).rejects.toThrow('difere');
    const other = await fixture();
    await expect(checkGuardianFile(JSON.stringify(other.file), reference)).rejects.toThrow(
      'outra chave',
    );
  });
  it('mantém alerta de comprometimento mesmo com hash correto', async () => {
    const { file, reference } = await fixture();
    const guardians = reference.guardians.map((g) => ({ ...g, status: 'comprometida' as const }));
    expect(
      (await checkGuardianFile(JSON.stringify(file), { ...reference, guardians })).compromised,
    ).toBe(true);
  });
  it('rejeita truncamento, texto inválido, limiar divergente e excesso de tamanho', async () => {
    const { file, reference } = await fixture();
    for (const text of [
      '{',
      'null',
      'x'.repeat(17000),
      JSON.stringify({ ...file, valor: 'AA==' }),
      JSON.stringify({ ...file, limiar: 2 }),
    ])
      await expect(checkGuardianFile(text, reference)).rejects.toThrow();
    expect(validGuardianDigests(['a'.repeat(64)], 5)).toBe(false);
    expect(validGuardianDigests(Array(5).fill('a'.repeat(64)), 5)).toBe(true);
  });
});
