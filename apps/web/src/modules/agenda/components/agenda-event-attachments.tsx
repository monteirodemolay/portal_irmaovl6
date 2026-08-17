'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArchiveItemCard, FileText } from '@vl6/ui';
import { getEventAttachmentsAction } from '../actions/agenda-actions';
import type { ResolvedArchiveItem } from '@/modules/archive/lib/resolve-archive-item';

export function AgendaEventAttachments({ eventId }: { eventId: string }) {
  const [attachments, setAttachments] = useState<ResolvedArchiveItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAttachments(null);
    getEventAttachmentsAction(eventId).then((items) => {
      if (!cancelled) setAttachments(items);
    });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (attachments === null) {
    return <p className="text-muted text-xs">Carregando arquivos…</p>;
  }

  if (attachments.length === 0) {
    return <p className="text-muted text-xs">Nenhum arquivo relacionado a este evento.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
      {attachments.map((item) => (
        <ArchiveItemCard
          key={item.compositeId}
          href={item.viewHref}
          kindLabel={item.kindLabel}
          icon={<FileText size={12} strokeWidth={1.75} />}
          titulo={item.titulo}
          descricao={item.categoriaNome}
          linkComponent={Link}
          className="p-3.5"
        />
      ))}
    </div>
  );
}
