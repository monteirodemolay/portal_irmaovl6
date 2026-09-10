'use client';

import { useState, useTransition } from 'react';
import { buildWhatsappLink } from '@vl6/shared';
import { Button, Input } from '@vl6/ui';
import {
  approveMemberAccessClaimAction,
  rejectMemberAccessClaimAction,
} from '../actions/member-access-claim-actions';

export function ModerateAccessClaimButtons({
  claimId,
  memberWhatsapp,
}: {
  claimId: string;
  memberWhatsapp: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  if (approved) {
    const whatsappHref =
      resetLink && memberWhatsapp
        ? `${buildWhatsappLink(memberWhatsapp)}?text=${encodeURIComponent(
            `Seu acesso ao Portal VL6 foi aprovado! Defina sua senha por este link: ${resetLink}`,
          )}`
        : null;
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-emerald-700">Aprovado</span>
        {resetLink ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigator.clipboard.writeText(resetLink)}
            >
              Copiar link de acesso
            </Button>
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                className="text-accent self-center text-xs font-semibold hover:underline"
              >
                Enviar por WhatsApp
              </a>
            )}
          </div>
        ) : (
          <span className="text-muted text-xs">
            Conta criada. Peça pro Irmão usar &quot;Esqueci minha senha&quot; no login.
          </span>
        )}
      </div>
    );
  }

  if (rejecting) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={motivo}
          onChange={(event) => setMotivo(event.target.value)}
          placeholder="Motivo da rejeição"
          className="h-8 w-48 text-xs"
        />
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending || motivo.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              const result = await rejectMemberAccessClaimAction(claimId, motivo.trim());
              if (result.error) {
                setError(result.error);
                return;
              }
              setRejecting(false);
            })
          }
        >
          Confirmar
        </Button>
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => setRejecting(false)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <Button
          variant="accent"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await approveMemberAccessClaimAction(claimId);
              if (result.error) {
                setError(result.error);
                return;
              }
              setResetLink(result.resetLink);
              setApproved(true);
            })
          }
        >
          Aprovar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() => setRejecting(true)}
        >
          Rejeitar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
