export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id: string) {
    super('not_found', `${entity} ${id} não encontrado.`);
  }
}

export class ForbiddenError extends DomainError {
  constructor(permission: string) {
    super('forbidden', `Permissão ausente: ${permission}.`);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('conflict', message);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('validation', message);
  }
}

/** Integração externa (ex.: Google Calendar) sem credenciais configuradas neste ambiente. */
export class IntegrationNotConfiguredError extends DomainError {
  constructor(integration: string) {
    super(
      'integration_not_configured',
      `Integração ${integration} não está configurada neste ambiente.`,
    );
  }
}

export type Result<T, E extends DomainError = DomainError> =
  { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E extends DomainError>(error: E): Result<never, E> {
  return { ok: false, error };
}
