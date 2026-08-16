'use client';

import { SoftDeleteButton } from '@/components/admin/soft-delete-button';

export function DeleteRelationButton({
  relationLabel,
  onDelete,
}: {
  relationLabel: string;
  onDelete: () => Promise<void>;
}) {
  return (
    <SoftDeleteButton
      triggerLabel="Remover"
      title="Remover relação"
      description={`Remover a relação "${relationLabel}"? Os dois registros conectados não são afetados.`}
      onDelete={onDelete}
    />
  );
}
