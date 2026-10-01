'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { LegalDocumentKey } from '@vl6/domain';
import { LegalDocumentText } from './legal-document-text';
import { acceptAllPendingLegalDocumentsAction } from '../actions/legal-actions';

export interface PendingLegalDoc {
  documento: LegalDocumentKey;
  titulo: string;
  versao: string;
  diffResumo: string | null;
  markdown: string;
  slug: string;
}

/**
 * Tela de boas-vindas de primeiro acesso (ou de reaceite de uma versão
 * atualizada) — substitui o antigo redirect obrigatório para
 * `/irmaos/configuracoes/termos-e-privacidade` por um overlay que aparece
 * por cima da própria página inicial do Irmão, já renderizada ao fundo.
 * Ao concluir o aceite dos documentos pendentes, o overlay se desfaz e a
 * página que já estava carregada atrás fica visível — sem navegação.
 */
export function FirstAccessWelcomeOverlay({
  displayName,
  pendingDocs,
  isFirstAccess,
}: {
  displayName: string;
  pendingDocs: PendingLegalDoc[];
  isFirstAccess: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);

  const canEnter = useMemo(
    () => pendingDocs.every((doc) => checked[doc.documento]),
    [pendingDocs, checked],
  );

  if (pendingDocs.length === 0) {
    return null;
  }

  function toggleChecked(documento: string) {
    setChecked((prev) => ({ ...prev, [documento]: !prev[documento] }));
  }

  function toggleExpanded(documento: string) {
    setExpanded((prev) => ({ ...prev, [documento]: !prev[documento] }));
  }

  function handleEnter() {
    if (!canEnter || isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await acceptAllPendingLegalDocumentsAction(
        pendingDocs.map((doc) => ({ documento: doc.documento, versao: doc.versao })),
      );
      if (!result.ok) {
        setError(result.error ?? 'Não foi possível registrar seu aceite. Tente novamente.');
        return;
      }
      setEntered(true);
      window.setTimeout(() => router.refresh(), 650);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 transition-[background-color,opacity] duration-700 ease-out sm:p-8"
      style={{
        backgroundColor: entered ? 'rgba(4,18,35,0)' : 'rgba(4,18,35,0.55)',
        opacity: entered ? 0 : 1,
        pointerEvents: entered ? 'none' : 'auto',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-overlay-title"
    >
      <div
        className="border-border bg-surface w-full max-w-lg overflow-hidden rounded-2xl shadow-2xl transition-transform duration-500 ease-out"
        style={{ transform: entered ? 'translateY(-16px) scale(0.96)' : 'translateY(0) scale(1)' }}
      >
        <div className="from-accent via-accent/70 to-accent h-1.5 bg-gradient-to-r" />

        <div className="flex flex-col gap-6 p-8 sm:p-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="bg-accent/15 flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                width="30"
                height="30"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="text-primary"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4.2" />
                <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
              </svg>
            </div>
            <span className="bg-primary text-accent rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
              {isFirstAccess ? 'Primeiro acesso' : 'Documentos atualizados'}
            </span>
            <h1 id="welcome-overlay-title" className="font-display text-2xl font-semibold">
              {isFirstAccess ? (
                <>Seja muito bem-vindo à Loja, Irmão {displayName}!</>
              ) : (
                <>Olá, Irmão {displayName}</>
              )}
            </h1>
            <p className="text-muted text-sm leading-relaxed">
              {isFirstAccess
                ? 'É uma alegria receber você no Portal. Antes de conhecer seu espaço, precisamos do seu aceite à Política de Privacidade e aos Termos de Uso — é rápido, e garante transparência sobre como seus dados são tratados.'
                : 'Atualizamos os documentos abaixo. Para continuar usando o Portal, revise e confirme seu aceite às novas versões.'}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {pendingDocs.map((doc) => (
              <div
                key={doc.documento}
                className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors ${
                  checked[doc.documento] ? 'border-accent bg-accent/5' : 'border-border'
                }`}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="accent-accent mt-0.5 h-5 w-5 min-w-5"
                    checked={Boolean(checked[doc.documento])}
                    onChange={() => toggleChecked(doc.documento)}
                  />
                  <span className="text-sm leading-snug">
                    Li e aceito {doc.documento === 'termos_uso' ? 'os' : 'a'} <b>{doc.titulo}</b>
                    {doc.diffResumo && (
                      <span className="text-muted block text-xs">{doc.diffResumo}</span>
                    )}
                  </span>
                </label>
                <div className="pl-8">
                  <button
                    type="button"
                    className="text-accent hover:text-accent/80 text-xs font-medium underline"
                    onClick={() => toggleExpanded(doc.documento)}
                  >
                    {expanded[doc.documento] ? 'Ocultar' : 'Ver resumo do documento'}
                  </button>
                  {expanded[doc.documento] && (
                    <div className="border-accent/40 mt-2 max-h-40 overflow-y-auto border-l-2 pl-3">
                      <LegalDocumentText markdown={doc.markdown} />
                      <Link
                        href={`/termos/${doc.slug}`}
                        target="_blank"
                        className="text-accent mt-3 inline-block text-xs font-medium hover:underline"
                      >
                        Abrir em uma página própria
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleEnter}
            disabled={!canEnter || isPending}
            className="bg-accent disabled:bg-border disabled:text-muted text-primary rounded-xl p-4 text-sm font-bold transition-colors disabled:cursor-not-allowed"
          >
            {isPending
              ? 'Registrando…'
              : canEnter
                ? 'Entrar no Portal'
                : 'Aceite os documentos acima para continuar'}
          </button>

          <p className="text-muted text-center text-[11px]">
            Seu aceite fica registrado com data e hora, e pode ser revisto depois em Configurações →
            Termos e Privacidade.
          </p>
        </div>
      </div>
    </div>
  );
}
