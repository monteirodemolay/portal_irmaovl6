export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

/**
 * Logger estruturado sem dependências — grava uma linha JSON por evento em
 * vez de texto livre, para que agregadores de log (Cloud Logging, Vercel,
 * etc.) consigam filtrar/consultar por campo (docs/architecture/10-roadmap.md
 * v1.3, "logging estruturado"). Mora em `@vl6/shared` porque tanto
 * `packages/infra` quanto `apps/web` precisam dele e nenhum dos dois pode
 * depender do outro (ver eslint-plugin-boundaries em packages/config/eslint).
 *
 * Escopo deliberadamente pequeno: não é um logger genérico com transports
 * plugáveis — só formata e escreve via `console.*`, que é o que toda
 * plataforma de deploy relevante aqui (Vercel, Cloud Run, Cloud Logging)
 * já coleta automaticamente dos streams padrão.
 */
function write(level: LogLevel, message: string, context?: LogContext): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
};

/** Serializa um `Error` para um `LogContext` sem perder `name`/`stack`. */
export function errorToLogContext(error: unknown): LogContext {
  if (error instanceof Error) {
    return { errorName: error.name, errorMessage: error.message, errorStack: error.stack };
  }
  return { error };
}
