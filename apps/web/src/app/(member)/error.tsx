'use client';

import { useEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, Button, RefreshCw } from '@vl6/ui';
import { ErrorDetails } from '@/components/error-details';

/**
 * Error boundary da área do Irmão — antes desta tela, uma exceção não
 * tratada em qualquer página de `/irmaos`, `/dashboard`, `/agenda` etc.
 * (ex.: `ForbiddenError` por Custom Claims desatualizados após uma
 * permissão nova ser adicionada — já aconteceu com `legalDocument:read`)
 * subia direto até `global-error.tsx`, que troca `<html>`/`<body>` inteiro
 * e às vezes renderiza em branco durante o streaming. Mesmo padrão de
 * `app/admin/error.tsx`. `reset()` tenta re-renderizar a árvore sem
 * recarregar tudo.
 */
export default function MemberAreaError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [eventId, setEventId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setEventId(Sentry.captureException(error, { tags: { boundary: 'member' } }));
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle size={28} className="text-red-600" />
      <h1 className="text-lg font-semibold">Algo deu errado nesta tela</h1>
      <p className="text-muted max-w-sm text-sm">
        Nossa equipe já foi notificada. Tente novamente — se o problema continuar, saia e entre no
        Portal de novo, ou avise a Secretaria.
      </p>
      <Button type="button" variant="outline" onClick={() => reset()} className="mt-1">
        <RefreshCw size={14} />
        Tentar novamente
      </Button>
      <ErrorDetails digest={error.digest} eventId={eventId} />
    </div>
  );
}
