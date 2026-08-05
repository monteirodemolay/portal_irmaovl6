'use client';

import { useReportWebVitals } from 'next/web-vitals';

/**
 * Envia Core Web Vitals (CLS, FCP, INP, LCP, TTFB) pro backend a cada
 * medição (docs/architecture/10-roadmap.md v1.3, "métricas de performance
 * (Web Vitals)") — vira log estruturado em `/api/v1/web-vitals`, o mesmo
 * pipeline de observabilidade do resto da API. `sendBeacon` não bloqueia
 * nem atrasa a navegação; cai para `fetch(..., { keepalive: true })` nos
 * (raros) navegadores sem suporte.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
      path: window.location.pathname,
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/v1/web-vitals', body);
      return;
    }
    void fetch('/api/v1/web-vitals', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    });
  });

  return null;
}
