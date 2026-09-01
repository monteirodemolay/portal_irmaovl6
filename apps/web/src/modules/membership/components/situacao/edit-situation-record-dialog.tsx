'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MEMBER_SITUATION_REASON_LABELS, MEMBER_SITUATION_REASONS } from '@vl6/shared';
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
  Select,
  Textarea,
} from '@vl6/ui';
import {
  editMemberSituationRecordAction,
  type SituationActionState,
} from '../../actions/member-actions';

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  return new Date(date).toISOString().slice(0, 10);
}

function reasonLabel(motivo: string): string {
  return (
    MEMBER_SITUATION_REASON_LABELS[motivo as keyof typeof MEMBER_SITUATION_REASON_LABELS] ?? motivo
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar correção'}
    </Button>
  );
}

/**
 * Correção de um registro já lançado — nunca cria nem apaga registro,
 * só ajusta o registro selecionado na linha do tempo. Sempre exige
 * justificativa (regra de integridade §8: "exigir justificativa para
 * edição retroativa").
 */
export function EditSituationRecordDialog({ record }: { record: MemberSituationRecord }) {
  const boundAction = editMemberSituationRecordAction.bind(null, record.id);
  const [state, formAction] = useActionState<SituationActionState, FormData>(boundAction, {
    error: null,
    success: false,
  });
  const [open, setOpen] = useState(false);
  const motivos = MEMBER_SITUATION_REASONS[record.situacao];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Corrigir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Corrigir registro</DialogTitle>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">Registro corrigido com sucesso.</p>
            <Button type="button" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="memberId" value={record.memberId} />

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`motivo-${record.id}`}>Motivo</Label>
              <Select id={`motivo-${record.id}`} name="motivo" defaultValue={record.motivo}>
                {motivos.map((m) => (
                  <option key={m} value={m}>
                    {reasonLabel(m)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`motivoOutroDescricao-${record.id}`}>
                Descrição do motivo (se "Outro")
              </Label>
              <Input
                id={`motivoOutroDescricao-${record.id}`}
                name="motivoOutroDescricao"
                defaultValue={record.motivoOutroDescricao ?? ''}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dataInicio-${record.id}`}>Data de início</Label>
              <Input
                id={`dataInicio-${record.id}`}
                name="dataInicio"
                type="date"
                defaultValue={toDateInputValue(record.dataInicio)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`documentoNumero-${record.id}`}>Nº do ato/documento</Label>
                <Input
                  id={`documentoNumero-${record.id}`}
                  name="documentoNumero"
                  defaultValue={record.documentoNumero ?? ''}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`documentoData-${record.id}`}>Data do documento</Label>
                <Input
                  id={`documentoData-${record.id}`}
                  name="documentoData"
                  type="date"
                  defaultValue={toDateInputValue(record.documentoData)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`observacoes-${record.id}`}>Observações internas</Label>
              <Textarea
                id={`observacoes-${record.id}`}
                name="observacoes"
                rows={3}
                defaultValue={record.observacoes ?? ''}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`anexos-${record.id}`}>Adicionar anexo (opcional)</Label>
              <Input
                id={`anexos-${record.id}`}
                name="anexos"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                multiple
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`justificativa-${record.id}`}>Justificativa da correção</Label>
              <Textarea id={`justificativa-${record.id}`} name="justificativa" rows={2} required />
            </div>

            {state.error && <p className="text-destructive text-sm">{state.error}</p>}
            <SubmitButton />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
