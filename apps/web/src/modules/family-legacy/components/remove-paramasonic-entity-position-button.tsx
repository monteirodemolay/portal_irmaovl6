'use client';

import { X } from '@vl6/ui';
import { removeParamasonicEntityPositionAction } from '../actions/paramasonic-entity-actions';

export function RemoveParamasonicEntityPositionButton({
  entityId,
  positionId,
}: {
  entityId: string;
  positionId: string;
}) {
  return (
    <form
      action={async () => {
        if (!confirm('Remover este cargo do catálogo?')) return;
        await removeParamasonicEntityPositionAction(entityId, positionId);
      }}
    >
      <button type="submit" aria-label="Remover cargo" className="text-muted hover:text-red-600">
        <X size={12} />
      </button>
    </form>
  );
}
