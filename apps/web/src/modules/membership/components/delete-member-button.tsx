'use client';

import { useTransition } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@vl6/ui';
import { softDeleteMemberAction } from '../actions/member-actions';

export function DeleteMemberButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Excluir Irmão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Excluir {memberName}?</DialogTitle>
          <DialogDescription>
            O registro é arquivado (soft delete) — histórico de cargos e presenças permanece intacto
            e pode ser restaurado depois. Esta ação remove o Irmão das listagens.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => startTransition(() => softDeleteMemberAction(memberId))}
          >
            {isPending ? 'Excluindo…' : 'Confirmar exclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
