import { describe, expect, it } from 'vitest';
import { isReceivingWindowOpen } from './receiving-window';
describe('recebimento com prazo obrigatório', () => {
  const openedAt = '2026-09-29T17:00:00Z';
  const closesAt = '2026-10-09T17:00:00Z';
  it('bloqueia configuração ausente, antiga, inválida e fechamento manual', () => {
    for (const record of [undefined, {}, { open: true }, { open: true, openedAt, closesAt: 'inválida' }, { open: false, openedAt, closesAt }])
      expect(isReceivingWindowOpen(record, Date.parse(openedAt))).toBe(false);
  });
  it('permite somente o intervalo autorizado e bloqueia o instante do encerramento', () => {
    const state = { open: true, openedAt, closesAt };
    expect(isReceivingWindowOpen(state, Date.parse(openedAt) - 1)).toBe(false);
    expect(isReceivingWindowOpen(state, Date.parse(openedAt))).toBe(true);
    expect(isReceivingWindowOpen(state, Date.parse(closesAt) - 1)).toBe(true);
    expect(isReceivingWindowOpen(state, Date.parse(closesAt))).toBe(false);
  });
});
