import { ArrowUpRight } from '@vl6/ui';

/** Apresentação institucional do Portal (arquivo estático público em `/apresentacao-vl6.html`). */
export function SidebarPresentationLink() {
  return (
    <a
      href="/apresentacao-vl6.html"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-[9px] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <span className="flex flex-col">
        <span>Apresentação do Portal</span>
        <span className="truncate text-xs text-white/50">Para exibir em Loja</span>
      </span>
      <ArrowUpRight size={16} className="shrink-0" />
    </a>
  );
}
