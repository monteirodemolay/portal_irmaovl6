'use client';

import { useState } from 'react';
import { Check, Copy } from '@vl6/ui';
import { DEPLOY_SHA_SHORT, DEPLOY_BUILT_AT } from '@/lib/observability/deploy-info';

/**
 * Bloco técnico mostrado nas telas de erro (`error.tsx`/`global-error.tsx`)
 * — sem isso, "Algo deu errado" não diz onde nem por quê, e cada relato de
 * usuário vira uma investigação do zero no Sentry. `error.digest` é gerado
 * pelo próprio Next.js e correlaciona com a entrada correspondente no log
 * do servidor (não expõe stack trace nem dado pessoal, só um hash). O SHA
 * do deploy identifica exatamente qual versão do código estava no ar —
 * compare com o histórico de deploys da Vercel pra achar o último que
 * funcionava.
 */
export function ErrorDetails({
  digest,
  eventId,
  /**
   * `global-error.tsx` substitui o `<html>`/`<body>` inteiro e roda antes
   * do CSS do app carregar — não dá pra confiar em classes Tailwind lá,
   * então esse modo usa só estilo inline.
   */
  plain = false,
}: {
  digest?: string;
  eventId?: string;
  plain?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const lines = [
    `Deploy: ${DEPLOY_SHA_SHORT}${DEPLOY_BUILT_AT ? ` (${DEPLOY_BUILT_AT})` : ''}`,
    digest ? `Digest: ${digest}` : null,
    eventId ? `Sentry: ${eventId}` : null,
  ].filter((line): line is string => line !== null);

  const handleCopy = () => {
    void navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (plain) {
    return (
      <div
        style={{
          marginTop: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.375rem',
          border: '1px dashed #d1d5db',
          borderRadius: '0.375rem',
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: '#6b7280',
        }}
      >
        {lines.map((line) => (
          <p key={line} style={{ margin: 0, fontFamily: 'monospace' }}>
            {line}
          </p>
        ))}
        <button
          type="button"
          onClick={handleCopy}
          style={{
            marginTop: '0.125rem',
            border: 'none',
            background: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          {copied ? 'Copiado' : 'Copiar detalhes'}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-1.5 rounded-md border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-500">
      {lines.map((line) => (
        <p key={line} className="font-mono">
          {line}
        </p>
      ))}
      <button
        type="button"
        onClick={handleCopy}
        className="mt-0.5 flex items-center gap-1 text-gray-400 hover:text-gray-600"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar detalhes'}
      </button>
    </div>
  );
}
