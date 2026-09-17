'use client';

import { Button, Trash2 } from '@vl6/ui';
import { removeParamasonicEntityMemberAction } from '../actions/paramasonic-entity-actions';

export function RemoveParamasonicEntityMemberButton({
  entityId,
  memberEntryId,
}: {
  entityId: string;
  memberEntryId: string;
}) {
  return (
    <form
      action={async () => {
        if (!confirm('Remover este integrante?')) return;
        await removeParamasonicEntityMemberAction(entityId, memberEntryId);
      }}
    >
      <Button type="submit" variant="ghost" size="sm" aria-label="Remover integrante">
        <Trash2 size={14} />
      </Button>
    </form>
  );
}
