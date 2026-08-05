'use client';

import type { Committee, Member } from '@vl6/domain';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@vl6/ui';
import { updateCommitteeAction } from '../actions/governance-actions';
import { CommitteeForm } from './committee-form';

export function EditCommitteeDialog({
  committee,
  gestaoId,
  members,
}: {
  committee: Committee;
  gestaoId: string;
  members: Member[];
}) {
  const boundAction = updateCommitteeAction.bind(null, committee.id, gestaoId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar {committee.nome}</DialogTitle>
        </DialogHeader>
        <CommitteeForm action={boundAction} members={members} committee={committee} />
      </DialogContent>
    </Dialog>
  );
}
