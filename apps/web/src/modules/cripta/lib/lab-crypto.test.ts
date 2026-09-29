import { describe, expect, it } from 'vitest';
import {
  createLabKey, decryptLabCapsule, encryptLabCapsule, exportLabKey,
  importLabKey, parseLabBundle,
} from './lab-crypto';

describe('Cripta laboratório: cifra autenticada', () => {
  it('recupera texto com a chave exportada e rejeita outra chave', async () => {
    const key = await createLabKey();
    const item = await encryptLabCapsule(key, 'Carta fictícia', 'Somente teste');
    const restored = await importLabKey(await exportLabKey(key));
    expect(await decryptLabCapsule(restored, item)).toEqual({ title: 'Carta fictícia', letter: 'Somente teste' });
    await expect(decryptLabCapsule(await createLabKey(), item)).rejects.toThrow();
  });

  it('rejeita conteúdo alterado, inclusive identificador associado', async () => {
    const key = await createLabKey();
    const item = await encryptLabCapsule(key, 'Teste', 'Conteúdo inventado');
    const changed = item.ciphertext.slice(0, -4) + (item.ciphertext.endsWith('AAAA') ? 'BBBB' : 'AAAA');
    await expect(decryptLabCapsule(key, { ...item, ciphertext: changed })).rejects.toThrow();
    await expect(decryptLabCapsule(key, { ...item, id: crypto.randomUUID() })).rejects.toThrow();
  });

  it('recusa pacote sem formato e versão esperados', () => {
    expect(() => parseLabBundle(JSON.stringify({ format: 'outro', version: 1, items: [] }))).toThrow();
    expect(() => parseLabBundle(JSON.stringify({ format: 'vl6-cripta-lab', version: 1, items: [] }))).not.toThrow();
  });
});
