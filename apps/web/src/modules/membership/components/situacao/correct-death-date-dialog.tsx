'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { MemberSituationRecord } from '@vl6/domain';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from '@vl6/ui';
import { correctDeathDateAction, type SituationActionState } from '../../actions/member-actions';

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar data'}
    </Button>
  );
}

/**
 * Atalho direto pra corrigir só a data de falecimento — sem passar pelo
 * diálogo completo de "Corrigir" do Histórico Maçônico (Motivo/Documento/
 * Anexos/Justificativa), que exige entender qual campo mexer entre vários
 * que não têm nada a ver com esse problema específico. Aparece só quando
 * o Irmão está em In Memoriam, ao lado do selo — mesmo `EditMemberSituationRecordUseCase`
 * por baixo, então `Member.dataFalecimento` é espelhado automaticamente.
 */
export function CorrectDeathDateDialog({ record }: { record: MemberSituationRecord }) {
  const boundAction = correctDeathDateAction.bind(null, record.id);
  const [state, formAction] = useActionState<SituationActionState, FormData>(boundAction, {
    error: null,
    success: false,
  });
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Corrigir data de falecimento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corrigir data de falecimento</DialogTitle>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">Data corrigida com sucesso.</p>
            <Button type="button" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="memberId" value={record.memberId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dataFalecimento-${record.id}`}>Data correta de falecimento</Label>
              <Input
                id={`dataFalecimento-${record.id}`}
                name="dataFalecimento"
                type="date"
                required
                defaultValue={toDateInputValue(record.dataInicio)}
              />
            </div>
            {state.error && <p className="text-destructive text-sm">{state.error}</p>}
            <SubmitButton />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
