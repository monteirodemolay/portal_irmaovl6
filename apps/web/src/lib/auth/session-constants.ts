// Constantes puras, sem dependência do Admin SDK — importável pelo
// middleware (Edge runtime). A lógica que usa firebase-admin fica em
// `session.ts`, importado apenas por código que roda em Node.js runtime
// (Route Handlers, Server Components).
export const SESSION_COOKIE_NAME = '__vl6_session';
/** 5 dias — docs/architecture/07-fluxo-autenticacao.md §7.8. */
export const SESSION_COOKIE_MAX_AGE_MS = 5 * 24 * 60 * 60 * 1000;
