import Link from 'next/link';
import type { Announcement } from '@vl6/domain';
import { AlertTriangle, Badge, Card, Pin } from '@vl6/ui';

export function ImportantNoticeCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden border-red-200 bg-red-50/70 p-6 shadow-sm">
      <AlertTriangle
        size={120}
        strokeWidth={1}
        className="pointer-events-none absolute -bottom-6 -right-6 text-red-200/60"
      />

      <div className="relative flex items-center justify-between gap-2">
        <Badge variant="destructive">Aviso importante</Badge>
        {announcement.destacar && (
          <span className="text-muted flex items-center gap-1 text-xs">
            <Pin size={12} strokeWidth={1.75} /> Fixado
          </span>
        )}
      </div>

      <div className="relative">
        <p className="font-display text-lg font-semibold text-red-900">{announcement.titulo}</p>
        <p className="text-muted mt-1.5 line-clamp-3 text-sm">{announcement.descricao}</p>
      </div>

      <Link
        href="/avisos"
        className="text-accent relative w-fit text-xs font-medium hover:underline"
      >
        Ver aviso completo
      </Link>
    </Card>
  );
}
