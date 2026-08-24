'use client';

import { useEffect, useState, useTransition } from 'react';
import { Badge, Button } from '@vl6/ui';
import {
  getAnnouncementReachReportAction,
  resendAnnouncementToPendingAction,
  type AnnouncementReachReport,
} from '../actions/announcement-report-actions';

export function AnnouncementReachReportCard({ announcementId }: { announcementId: string }) {
  const [report, setReport] = useState<AnnouncementReachReport | null>(null);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function reload() {
    startTransition(async () => {
      setReport(await getAnnouncementReachReportAction(announcementId));
    });
  }

  useEffect(reload, [announcementId]);

  if (!report) {
    return <p className="text-muted text-sm">Carregando alcance…</p>;
  }

  return (
    <div className="border-border flex flex-col gap-4 rounded-lg border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide">
          Alcance e leitura
        </h2>
        {report.pendentes.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await resendAnnouncementToPendingAction(announcementId);
                setFeedback(`Reenviado para ${report.pendentes.length} pendente(s).`);
                reload();
              })
            }
          >
            Reenviar aos pendentes
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Destinatários" value={report.total} />
        <Stat label="Leram" value={report.lidas} />
        {report.requiresAcknowledgement && <Stat label="Deram ciência" value={report.ciente} />}
        <Stat label="Pendentes" value={report.pendentes.length} />
      </div>
      {feedback && <p className="text-sm text-emerald-700">{feedback}</p>}
      {report.pendentes.length > 0 && (
        <div>
          <p className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
            {report.requiresAcknowledgement ? 'Ainda sem ciência' : 'Ainda não leram'}
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {report.pendentes.map((pendente) => (
              <li key={pendente.userId}>
                <Badge variant="outline">{pendente.nome}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted text-[11px] uppercase tracking-wide">{label}</p>
      <p className="font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
