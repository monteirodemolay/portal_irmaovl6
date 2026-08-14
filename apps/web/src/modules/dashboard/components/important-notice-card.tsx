import Link from 'next/link';
import type { Announcement } from '@vl6/domain';
import { AlertTriangle, Badge, Card } from '@vl6/ui';

export function ImportantNoticeCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card className="flex flex-col gap-3 border-amber-300/60 bg-amber-50 p-5 shadow-none">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle size={16} strokeWidth={1.75} />
        </span>
        <Badge variant="warning">Aviso importante</Badge>
      </div>
      <div>
        <p className="font-display text-base font-semibold">{announcement.titulo}</p>
        <p className="text-muted mt-1 line-clamp-3 text-sm">{announcement.descricao}</p>
      </div>
      <Link href="/avisos" className="text-accent text-xs font-medium hover:underline">
        Ver todos os avisos
      </Link>
    </Card>
  );
}
