import { describe, expect, it } from 'vitest';
import { parseOnlineLetter } from './online-letter';

const letter = (overrides: Record<string, unknown> = {}) => JSON.stringify({
  format: 'vl6-online-letter-v1', title: '', recipient: '', body: '', attachments: [], ...overrides,
});

describe('validação do pacote online', () => {
  it('aceita rascunho incompleto e exige destinatário e texto na conclusão', () => {
    expect(parseOnlineLetter(letter(), false).body).toBe('');
    expect(() => parseOnlineLetter(letter(), true)).toThrow('Carta inválida');
  });

  it('recusa anexos acima da cota efetiva de 650 KB mesmo se a interface falhar', () => {
    const photo = { kind: 'foto', name: 'a.jpg', type: 'image/jpeg', data: Buffer.alloc(650_001).toString('base64') };
    expect(() => parseOnlineLetter(letter({ recipient: 'Família', body: 'Olá', attachments: [photo] }), true))
      .toThrow('Anexos acima');
  });
});
