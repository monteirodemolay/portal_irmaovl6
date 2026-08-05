'use client';

import { useEffect } from 'react';

/**
 * Registra o Service Worker (public/sw.js) para instalabilidade e leitura
 * offline básica (docs/architecture/10-roadmap.md v1.3 — "PWA completo").
 * `<script>`-less client component em vez de registro inline no `<head>`
 * para evitar bloquear o carregamento inicial da página.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw.js');
  }, []);

  return null;
}
