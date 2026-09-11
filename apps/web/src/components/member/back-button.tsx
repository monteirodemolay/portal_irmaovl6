'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@vl6/ui';

/**
 * "Voltar" de verdade (histórico do navegador) — ao contrário do link
 * hierárquico fixo do `AcervoPageHeader` (que sempre leva pro mesmo lugar,
 * ex.: "Acervo VL6 · Coleções"), este botão volta pra ONDE o Irmão estava
 * antes de entrar aqui — inclusive uma busca com filtros na URL
 * (`/acervo/pesquisar?q=...`, `/irmaos?...`), que fica intacta porque nunca
 * saiu do histórico. Sem fallback pra rota fixa: se não há histórico (ex.:
 * link compartilhado aberto direto), o próprio breadcrumb ao lado resolve.
 */
export function BackButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={
        className ??
        'text-muted hover:text-accent flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide'
      }
    >
      <ArrowLeft size={12} strokeWidth={2} />
      Voltar
    </button>
  );
}
