'use client';

import { useState, useTransition } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Textarea,
} from '@vl6/ui';
import {
  reactivateCentralProfileAction,
  suspendCentralProfileAction,
} from '../actions/central-actions';

export function SuspendCentralProfileButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [motivo, setMotivo] = useState('');

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Suspender
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suspender publicação de {memberName}?</DialogTitle>
          <DialogDescription>
            A exibição do perfil na Central é congelada — a configuração do Irmão fica preservada e
            volta como estava ao reativar. Isso não é uma retirada voluntária, é uma moderação
            administrativa.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Motivo da suspensão (obrigatório)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending || !motivo.trim()}
            onClick={() => startTransition(() => suspendCentralProfileAction(memberId, motivo))}
          >
            {isPending ? 'Suspendendo…' : 'Confirmar suspensão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReactivateCentralProfileButton({ memberId }: { memberId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => startTransition(() => reactivateCentralProfileAction(memberId))}
    >
      {isPending ? 'Reativando…' : 'Reativar'}
    </Button>
  );
}
