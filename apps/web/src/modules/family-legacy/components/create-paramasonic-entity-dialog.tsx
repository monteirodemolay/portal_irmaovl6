'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  FRATERNAL_AFFILIATION_LABELS,
  PARAMASONIC_ENTITY_KINDS,
  PARAMASONIC_ENTITY_STATUS_LABELS,
  PARAMASONIC_ENTITY_STATUSES,
} from '@vl6/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Plus,
  Select,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  createParamasonicEntityAction,
  type ParamasonicEntityActionState,
} from '../actions/paramasonic-entity-actions';

export function CreateParamasonicEntityDialog({
  defaultParentUnitName,
}: {
  defaultParentUnitName: string;
}) {
  const [state, formAction] = useActionState<ParamasonicEntityActionState, FormData>(
    createParamasonicEntityAction,
    { error: null },
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} />
          Nova entidade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar nova entidade paramaçônica</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 sm:grid-cols-2">
          <FormField label="Tipo da entidade" htmlFor="kind">
            <Select id="kind" name="kind" required defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              {PARAMASONIC_ENTITY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {FRATERNAL_AFFILIATION_LABELS[kind]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Situação" htmlFor="situacao">
            <Select id="situacao" name="situacao" required defaultValue="ativa">
              {PARAMASONIC_ENTITY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PARAMASONIC_ENTITY_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Nome oficial" htmlFor="name">
              <Input
                id="name"
                name="name"
                required
                placeholder="Ex.: Capítulo Guardiões da Vigilância"
              />
            </FormField>
          </div>
          <FormField label="Nome curto" htmlFor="shortName">
            <Input id="shortName" name="shortName" required placeholder="Ex.: DeMolays" />
          </FormField>
          <FormField
            label="Número / identificação"
            htmlFor="unitNumber"
            description="Opcional — nº do Capítulo/Bethel."
          >
            <Input id="unitNumber" name="unitNumber" />
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Entidade responsável" htmlFor="parentUnitName">
              <Input
                id="parentUnitName"
                name="parentUnitName"
                defaultValue={defaultParentUnitName}
                required
              />
            </FormField>
          </div>
          <div className="border-border bg-surface flex flex-col gap-2 rounded-lg border p-3 sm:col-span-2">
            <span className="text-sm font-medium">Módulos habilitados</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="moduleIntegrantes" defaultChecked />
              Integrantes e diretoria
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="moduleAgenda" defaultChecked />
              Agenda e avisos
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="moduleContent" defaultChecked />
              Documentos e acervo
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="modulePublicPage" />
              Página informativa para os Irmãos
            </label>
          </div>
          <p className="text-muted text-xs sm:col-span-2">
            A nova entidade nasce isolada: nenhum integrante ou documento fica visível até que a
            Administração configure os acessos.
          </p>
          {state.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
          <div className="sm:col-span-2">
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Criando…' : 'Criar entidade'}
    </Button>
  );
}
