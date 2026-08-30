import * as React from 'react';
import { cn } from '../lib/cn';
import { Milestone } from '../icons';

export interface LodgeTenureBadgeProps {
  /** `Member.dataIniciacao` — quando `null`/ainda não completou 1 ano, o selo não renderiza nada. */
  dataIniciacao: Date | string | null;
  /** Contador opcional (ex.: fotografias no Acervo) — só peça isso em telas de perfil único, nunca em grades com muitos cards (evita N+1). */
  participacoes?: number;
  participacoesLabel?: string;
  className?: string;
}

function anosNaLoja(dataIniciacao: Date | string): number {
  const inicio = new Date(dataIniciacao);
  const hoje = new Date();
  let anos = hoje.getFullYear() - inicio.getFullYear();
  const aindaNaoFezAniversarioEsteAno =
    hoje.getMonth() < inicio.getMonth() ||
    (hoje.getMonth() === inicio.getMonth() && hoje.getDate() < inicio.getDate());
  if (aindaNaoFezAniversarioEsteAno) anos -= 1;
  return anos;
}

/**
 * "Selo de Trajetória" — tempo de Loja (e, opcionalmente, participações no
 * Acervo) resumido num único chip reusável nos três lugares onde um Irmão é
 * mostrado: card do Diretório, card de Negócios & Serviços e página de
 * pessoa no Acervo VL6. Mesmo dado, mesma cara, em todo canto — parte do
 * plano de conectar Acervo e Diretório (docs/architecture). Puramente
 * apresentação: quem chama decide se pede `participacoes` (só faz sentido
 * pedir numa tela de perfil único, nunca numa grade com dezenas de cards).
 */
export function LodgeTenureBadge({
  dataIniciacao,
  participacoes,
  participacoesLabel = 'registros no Acervo',
  className,
}: LodgeTenureBadgeProps) {
  if (!dataIniciacao) return null;
  const anos = anosNaLoja(dataIniciacao);
  if (anos < 1) return null;

  return (
    <span
      className={cn(
        'bg-accent/10 text-primary-dark inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        className,
      )}
    >
      <Milestone size={12} className="shrink-0" />
      Há {anos} {anos === 1 ? 'ano' : 'anos'} na Loja
      {typeof participacoes === 'number' && participacoes > 0
        ? ` · ${participacoes} ${participacoesLabel}`
        : ''}
    </span>
  );
}
