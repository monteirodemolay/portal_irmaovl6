import { Compass } from '@vl6/ui';

export function SidebarBrand({
  crestUrl,
  title,
  subtitle,
}: {
  crestUrl: string | null;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {crestUrl ? (
        <img src={crestUrl} alt="" className="h-11 w-11 shrink-0 object-contain" />
      ) : (
        <span className="bg-accent/15 text-accent flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <Compass size={22} strokeWidth={1.75} />
        </span>
      )}
      <div className="min-w-0">
        <p className="font-display truncate text-base font-semibold text-white">{title}</p>
        <p className="truncate text-xs text-white/60">{subtitle}</p>
      </div>
    </div>
  );
}
