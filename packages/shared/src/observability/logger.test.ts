import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorToLogContext, logger } from './logger';

describe('logger', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('info/debug escrevem uma linha JSON via console.log', () => {
    logger.info('Usuário autenticado', { uid: 'u1' });

    expect(logSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(logSpy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({ level: 'info', message: 'Usuário autenticado', uid: 'u1' });
    expect(typeof entry.timestamp).toBe('string');
  });

  it('warn escreve via console.warn', () => {
    logger.warn('Login inválido', { email: 'x@y.com' });

    expect(warnSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(warnSpy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({ level: 'warn', message: 'Login inválido' });
  });

  it('error escreve via console.error', () => {
    logger.error('Falha inesperada', { route: 'GET /api/v1/x' });

    expect(errorSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse(errorSpy.mock.calls[0]![0] as string);
    expect(entry).toMatchObject({ level: 'error', message: 'Falha inesperada' });
  });
});

describe('errorToLogContext', () => {
  it('extrai name/message/stack de um Error', () => {
    const error = new TypeError('algo quebrou');
    const context = errorToLogContext(error);

    expect(context.errorName).toBe('TypeError');
    expect(context.errorMessage).toBe('algo quebrou');
    expect(typeof context.errorStack).toBe('string');
  });

  it('preserva valores não-Error sob a chave error', () => {
    expect(errorToLogContext('oops')).toEqual({ error: 'oops' });
  });
});
