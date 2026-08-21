import Link from 'next/link';
import { cn } from '@vl6/ui';

/**
 * Alterna entre a listagem principal (itens ativos) e "Concluídos"
 * (vencidos/passados/inativos + excluídos) — mantidos só como registro,
 * fora do fluxo de trabalho do dia a dia. Reaproveitado em Avisos, Agenda,
 * Notícias e Frases.
 */
export function ConcludedTabNav({
  basePath,
  aba,
}: {
  basePath: string;
  aba: 'principal' | 'concluidos';
}) {
  return (
    <div className="border-border flex gap-4 border-b text-sm">
      <Link
        href={basePath}
        className={cn(
          'border-b-2 pb-2',
          aba === 'principal' ? 'border-accent font-semibold' : 'text-muted border-transparent',
        )}
      >
        Principal
      </Link>
      <Link
        href={`${basePath}?aba=concluidos`}
        className={cn(
          'border-b-2 pb-2',
          aba === 'concluidos' ? 'border-accent font-semibold' : 'text-muted border-transparent',
        )}
      >
        Concluídos
      </Link>
    </div>
  );
}
