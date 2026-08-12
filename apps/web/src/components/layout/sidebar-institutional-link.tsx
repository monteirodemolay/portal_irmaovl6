import { ArrowUpRight } from '@vl6/ui';

export function SidebarInstitutionalLink({
  siteUrl,
  tenantName,
}: {
  siteUrl: string;
  tenantName: string;
}) {
  return (
    <a
      href={siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-2 rounded-[9px] px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      <span className="flex flex-col">
        <span>Visitar site da Loja</span>
        <span className="truncate text-xs text-white/50">{tenantName}</span>
      </span>
      <ArrowUpRight size={16} className="shrink-0" />
    </a>
  );
}
