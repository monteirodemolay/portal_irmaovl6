/**
 * Identifica qual deploy está no ar (docs/architecture/10-roadmap.md v1.3,
 * "alertas de erro") — sem isso, um "Algo deu errado" reportado pelo usuário
 * não diz a que versão do código ele se refere, e comparar com o histórico
 * de deploys da Vercel vira adivinhação. `NEXT_PUBLIC_DEPLOY_SHA`/
 * `NEXT_PUBLIC_DEPLOY_BUILT_AT` são inlinados em build por `next.config.ts`
 * a partir de `VERCEL_GIT_COMMIT_SHA` (vazio fora da Vercel, ex. `next dev`).
 * `release` do Sentry usa o mesmo SHA, então o mesmo valor mostrado aqui
 * também filtra os eventos daquele deploy específico no Sentry.
 */
export const DEPLOY_SHA = process.env.NEXT_PUBLIC_DEPLOY_SHA || 'dev-local';
export const DEPLOY_SHA_SHORT = DEPLOY_SHA.slice(0, 7);
export const DEPLOY_BUILT_AT = process.env.NEXT_PUBLIC_DEPLOY_BUILT_AT || null;

export function formatDeployLabel(): string {
  if (!DEPLOY_BUILT_AT) return `deploy ${DEPLOY_SHA_SHORT}`;
  return `deploy ${DEPLOY_SHA_SHORT} · ${DEPLOY_BUILT_AT}`;
}
