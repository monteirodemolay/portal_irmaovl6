import { describe, expect, it } from 'vitest';
import { guardianAlertLevel, isGuardianShareStatus, validShareCount } from './guardian-shares-shape';

describe('validShareCount', () => {
  it('conta só as partes válidas', () => {
    const shares = [
      { memberId: 'a', status: 'valida' as const },
      { memberId: 'b', status: 'comprometida' as const },
      { memberId: 'c', status: 'valida' as const },
    ];
    expect(validShareCount(shares)).toBe(2);
  });
});

describe('guardianAlertLevel', () => {
  it('ok com todas as 5 partes válidas', () => {
    expect(guardianAlertLevel(5, 5, 3)).toBe('ok');
  });

  it('atenção com uma parte comprometida, ainda bem acima do limiar', () => {
    expect(guardianAlertLevel(4, 5, 3)).toBe('atencao');
  });

  it('urgente exatamente no limiar — última margem segura', () => {
    expect(guardianAlertLevel(3, 5, 3)).toBe('urgente');
  });

  it('crítico abaixo do limiar — não há mais como reconstruir a chave', () => {
    expect(guardianAlertLevel(2, 5, 3)).toBe('critico');
    expect(guardianAlertLevel(0, 5, 3)).toBe('critico');
  });
});

describe('isGuardianShareStatus', () => {
  it('aceita só os dois valores reconhecidos', () => {
    expect(isGuardianShareStatus('valida')).toBe(true);
    expect(isGuardianShareStatus('comprometida')).toBe(true);
    expect(isGuardianShareStatus('invalida')).toBe(false);
    expect(isGuardianShareStatus(undefined)).toBe(false);
  });
});
