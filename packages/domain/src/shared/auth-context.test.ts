import { describe, expect, it } from 'vitest';
import { ForbiddenError } from './result';
import { hasPermission, requirePermission, type AuthContext } from './auth-context';

const ctx = (permissions: AuthContext['permissions']): AuthContext => ({
  uid: 'u1',
  tenantId: 't1',
  roleId: 'r1',
  permissions,
});

describe('hasPermission', () => {
  it('concede quando a permissão exata está presente', () => {
    expect(hasPermission(ctx(['member:update']), 'member:update')).toBe(true);
  });

  it('concede quando o papel tem <recurso>:manage', () => {
    expect(hasPermission(ctx(['member:manage']), 'member:update')).toBe(true);
  });

  it('nega quando não há permissão relacionada', () => {
    expect(hasPermission(ctx(['news:read']), 'member:update')).toBe(false);
  });
});

describe('requirePermission', () => {
  it('lança ForbiddenError quando a permissão está ausente', () => {
    expect(() => requirePermission(ctx([]), 'member:update')).toThrow(ForbiddenError);
  });

  it('não lança quando a permissão está presente', () => {
    expect(() => requirePermission(ctx(['member:manage']), 'member:update')).not.toThrow();
  });
});
