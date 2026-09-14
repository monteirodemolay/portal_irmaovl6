'use client';

import type { Honor } from '@vl6/domain';
import { HONOR_TYPE_LABELS } from '@vl6/shared';
import { Badge, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@vl6/ui';
import { HONOR_TYPE_BADGE_ICON } from '@/modules/honors/honor-badge-icons';
import { formatDate } from './profile-shared';

/**
 * Modal "Ver detalhes" de uma Honraria/Condecoração — abre a partir do
 * card resumido na aba "Trajetória e Honrarias". Sem upload de diploma/foto
 * de entrega ainda (Fase 3 cobre só o cadastro textual); quando existirem,
 * `diplomaFileId`/`fotoEntregaFileId` ganham um link aqui.
 */
export function HonorDetailDialog({ honor }: { honor: Honor }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-accent text-xs font-semibold hover:underline">Ver detalhes</button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <img
            src={HONOR_TYPE_BADGE_ICON[honor.tipo]}
            alt=""
            className="mb-2 h-16 w-16 object-contain"
          />
          <DialogTitle>{honor.nomeOficial}</DialogTitle>
          <Badge variant="outline" className="w-fit">
            {HONOR_TYPE_LABELS[honor.tipo]}
          </Badge>
        </DialogHeader>

        <dl className="flex flex-col gap-2.5 text-sm">
          <div className="border-border flex items-center justify-between border-b border-dashed pb-2 last:border-0">
            <dt className="text-muted text-xs">Instituição concedente</dt>
            <dd className="text-right font-medium">{honor.instituicaoConcedente}</dd>
          </div>
          {honor.data && (
            <div className="border-border flex items-center justify-between border-b border-dashed pb-2 last:border-0">
              <dt className="text-muted text-xs">Data</dt>
              <dd className="text-right font-medium">{formatDate(honor.data)}</dd>
            </div>
          )}
          {honor.numeroAto && (
            <div className="border-border flex items-center justify-between border-b border-dashed pb-2 last:border-0">
              <dt className="text-muted text-xs">Ato</dt>
              <dd className="text-right font-medium">{honor.numeroAto}</dd>
            </div>
          )}
          {honor.motivo && (
            <div className="border-border flex items-center justify-between border-b border-dashed pb-2 last:border-0">
              <dt className="text-muted text-xs">Motivo</dt>
              <dd className="text-right font-medium">{honor.motivo}</dd>
            </div>
          )}
        </dl>

        {honor.descricaoHistorica && (
          <p className="text-muted border-border mt-4 border-t pt-4 text-sm leading-relaxed">
            {honor.descricaoHistorica}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
