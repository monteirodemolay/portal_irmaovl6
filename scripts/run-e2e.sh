#!/usr/bin/env bash
# Orquestra os testes E2E (Playwright) contra o Firebase Emulator Suite —
# nunca contra um projeto Firebase real. Chamado via `firebase emulators:exec`
# (ver `pnpm test:e2e` na raiz), que já injeta FIRESTORE_EMULATOR_HOST e
# FIREBASE_AUTH_EMULATOR_HOST no ambiente antes deste script rodar.
set -euo pipefail

export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-demo-vl6}"
export ADMIN_EMAIL="${ADMIN_EMAIL:-e2e-admin@vl6.test}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-SenhaForte123!}"
# "localhost" para o middleware resolver o tenant pelo host que o
# Playwright de fato usa (127.0.0.1:3100) — ver ResolveTenantByHostUseCase.
export TENANT_SUBDOMINIO="localhost"

echo "==> Seed do tenant/admin de E2E"
pnpm --filter @vl6/scripts run seed-tenant

echo "==> Rodando Playwright"
pnpm --filter @vl6/web exec playwright test
