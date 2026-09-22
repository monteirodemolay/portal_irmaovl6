'use client';

import { useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Member } from '@vl6/domain';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
} from '@vl6/ui';
import {
  assignBoardPositionAction,
  removeBoardPositionAction,
  type GovernanceActionState,
} from '../actions/governance-actions';

function TrocarSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? 'Trocando…' : 'Trocar'}
    </Button>
  );
}

/**
 * Card de um titular específico na Diretoria — substitui a versão
 * só-leitura anterior (que exigia voltar pro card "Atribuir cargo" lá em
 * cima e adivinhar que reenviar o mesmo cargo troca o titular). Cada
 * assinatura (`BoardPositionAssignment`) ganha seu próprio card, mesmo
 * quando o cargo admite mais de um titular (Diácono/Experto) — trocar ou
 * remover um não mexe no outro.
 */
export function BoardPositionSeatCard({
  gestaoId,
  assignmentId,
  cargo,
  label,
  nomeAtual,
  ordem,
  members,
}: {
  gestaoId: string;
  assignmentId: string;
  cargo: string;
  label: string;
  nomeAtual: string;
  ordem: number;
  members: Member[];
}) {
  const [trocando, setTrocando] = useState(false);
  const boundAssign = assignBoardPositionAction.bind(null, gestaoId);
  const [state, formAction] = useActionState<GovernanceActionState, FormData>(boundAssign, {
    error: null,
  });
  const [isRemoving, startRemoveTransition] = useTransition();

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="accent" className="w-fit">
            {label}
          </Badge>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setTrocando((current) => !current)}
            >
              {trocando ? 'Cancelar' : 'Editar'}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="ghost" className="text-red-600">
                  Remover
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    Remover {nomeAtual} de {label}?
                  </DialogTitle>
                  <DialogDescription>
                    O cargo fica vago nesta Gestão até alguém ser atribuído de novo. O histórico de
                    quem já ocupou o cargo continua registrado.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="destructive"
                    disabled={isRemoving}
                    onClick={() =>
                      startRemoveTransition(() => removeBoardPositionAction(gestaoId, assignmentId))
                    }
                  >
                    {isRemoving ? 'Removendo…' : 'Confirmar remoção'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {trocando ? (
          <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="cargo" value={cargo} />
            <input type="hidden" name="ordem" value={ordem} />
            <Select name="memberId" required defaultValue="">
              <option value="" disabled>
                Selecione o novo titular…
              </option>
              {members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nomeCompleto}
                </option>
              ))}
            </Select>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <TrocarSubmitButton />
          </form>
        ) : (
          <p className="text-sm font-medium">{nomeAtual}</p>
        )}
      </CardContent>
    </Card>
  );
}
