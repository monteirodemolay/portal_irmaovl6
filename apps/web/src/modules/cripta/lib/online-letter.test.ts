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

  it('recusa anexos acima da cota efetiva de 2,3 MB mesmo se a interface falhar', () => {
    const photo = { kind: 'foto', name: 'a.jpg', type: 'image/jpeg', data: Buffer.alloc(2_300_001).toString('base64') };
    expect(() => parseOnlineLetter(letter({ recipient: 'Família', body: 'Olá', attachments: [photo] }), true, true))
      .toThrow('Anexos acima');
  });

  it('preserva a leitura de carta legada com 2,5 MB sem aceitar essa cota em gravação nova', () => {
    const photo = { kind: 'foto', name: 'a.jpg', type: 'image/jpeg', data: Buffer.alloc(2_500_000).toString('base64') };
    const legacy = letter({ recipient: 'Família', body: 'Olá', attachments: [photo] });
    expect(parseOnlineLetter(legacy, true).attachments).toHaveLength(1);
    expect(() => parseOnlineLetter(legacy, true, true)).toThrow();
  });

  it('aceita o tamanho máximo anunciado quando o JSON permanece abaixo do teto da função', () => {
    const photo = { kind: 'foto', name: 'a.jpg', type: 'image/jpeg', data: Buffer.alloc(2_300_000).toString('base64') };
    expect(parseOnlineLetter(letter({ recipient: 'Família', body: 'Olá', attachments: [photo] }), true, true).attachments).toHaveLength(1);
  });
});
