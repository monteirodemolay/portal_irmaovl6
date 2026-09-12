'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Button, RefreshCw } from '@vl6/ui';

/**
 * Error boundary da área administrativa — antes desta tela, qualquer
 * exceção não tratada numa página de `/admin` (ex.: `FAILED_PRECONDITION`
 * de uma query composta sem índice pronto em produção) subia direto até
 * `global-error.tsx`, derrubando o `<html>`/`<body>` inteiro em vez de só
 * essa página. `reset()` tenta re-renderizar a árvore sem recarregar tudo.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error, { tags: { boundary: 'admin' } });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle size={28} className="text-red-600" />
      <h1 className="text-lg font-semibold">Algo deu errado nesta tela</h1>
      <p className="text-muted max-w-sm text-sm">
        Nossa equipe já foi notificada. Tente novamente — se o problema continuar, avise um
        Administrador do sistema.
      </p>
      <Button type="button" variant="outline" onClick={() => reset()} className="mt-1">
        <RefreshCw size={14} />
        Tentar novamente
      </Button>
    </div>
  );
}
