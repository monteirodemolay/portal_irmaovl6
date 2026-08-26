'use client';

import { useTransition } from 'react';
import { Button } from '@vl6/ui';
import { reviewBusinessSubmissionAction } from '../actions/central-actions';

export function BusinessReviewActions({
  memberId,
  businessId,
}: {
  memberId: string;
  businessId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => reviewBusinessSubmissionAction(memberId, businessId, 'approve'))
        }
      >
        {isPending ? 'Aguarde…' : 'Aprovar'}
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={isPending}
        onClick={() =>
          startTransition(() => reviewBusinessSubmissionAction(memberId, businessId, 'reject'))
        }
      >
        Rejeitar
      </Button>
    </div>
  );
}

export function SuspendBusinessButton({
  memberId,
  businessId,
}: {
  memberId: string;
  businessId: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      variant="destructive"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(() => reviewBusinessSubmissionAction(memberId, businessId, 'suspend'))
      }
    >
      {isPending ? 'Aguarde…' : 'Suspender'}
    </Button>
  );
}
