'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

/**
 * Captura erros de renderização que escapam de todo error boundary da árvore
 * — o único ponto da convenção do App Router para isso (docs/architecture/
 * 10-roadmap.md v1.3, "alertas de erro"). Substitui o `RootLayout` inteiro
 * quando dispara, por isso define `<html>`/`<body>` própios e evita depender
 * do CSS do app (que pode não ter carregado nesse ponto).
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1.5rem',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Algo deu errado</h1>
          <p style={{ color: '#6b7280' }}>
            Nossa equipe já foi notificada. Tente recarregar a página.
          </p>
        </div>
      </body>
    </html>
  );
}
