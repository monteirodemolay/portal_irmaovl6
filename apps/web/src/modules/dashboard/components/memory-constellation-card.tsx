import Link from 'next/link';
import { ChevronRight, Compass } from '@vl6/ui';

/**
 * Bloco discreto e separado do grid de atalhos do Acervo — a Constelação
 * da Memória não é "mais uma categoria" do Acervo, é a exploração dos
 * vínculos familiares/maçônicos do Irmão, por isso ganha destaque próprio
 * abaixo dos atalhos em vez de virar um quinto tile igual aos demais.
 */
export function MemoryConstellationCard() {
  return (
    <Link
      href="/acervo/constelacao"
      className="border-border bg-background hover:border-accent/40 group flex items-center justify-between gap-3 rounded-lg border p-3.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="bg-accent/15 text-accent flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
          <Compass size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="font-display truncate text-sm font-semibold">Constelação da Memória</p>
          <p className="text-muted truncate text-xs">
            Explore seus vínculos familiares e maçônicos
          </p>
        </div>
      </div>
      <ChevronRight
        size={18}
        className="text-accent shrink-0 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
