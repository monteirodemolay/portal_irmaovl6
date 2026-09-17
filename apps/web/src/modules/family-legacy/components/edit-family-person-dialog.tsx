'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  FRATERNAL_AFFILIATION_KINDS,
  FRATERNAL_AFFILIATION_LABELS,
  FRATERNAL_UNIT_KINDS,
  FRATERNAL_UNIT_KIND_LABELS,
  PERSON_LIFE_STATUSES,
  PERSON_LIFE_STATUS_LABELS,
} from '@vl6/shared';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
  Textarea,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import type { OwnerFamilyNetworkDTO } from '../lib/load-owner-family-network-dto';
import {
  createPersonFraternalRecordAction,
  updateFamilyMemberAction,
  type FamilyLegacyActionState,
} from '../actions/family-legacy-actions';

const EMPTY_STATE: FamilyLegacyActionState = { error: null };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')).toUpperCase();
}

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

type PersonCard = OwnerFamilyNetworkDTO['groups'][keyof OwnerFamilyNetworkDTO['groups']][number];

/**
 * Editar dados de um `FamilyPerson` já cadastrado — resolve tanto "cadastrei
 * incompleto" quanto "de qual Loja ele era" (caso do bisavô fundador da
 * Estrela Rioverdense, trazido pelo Administrador) no mesmo lugar: dois
 * formulários independentes, um pros dados da pessoa e outro pra registrar
 * vínculos maçônicos/paramaçônicos (pode registrar mais de um).
 */
export function EditFamilyPersonDialog({ person }: { person: PersonCard }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {person.nomeCompleto}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          <PersonDataForm person={person} />
          <div className="border-border-soft border-t pt-5">
            <FraternalRecordForm person={person} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PersonDataForm({ person }: { person: PersonCard }) {
  const boundAction = updateFamilyMemberAction.bind(null, person.id);
  const [state, formAction] = useActionState(boundAction, EMPTY_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          <AvatarImage src={person.fotoUrl ?? undefined} alt="" />
          <AvatarFallback>{initials(person.nomeCompleto)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <FormField label="Foto (opcional)" htmlFor="foto">
            <Input id="foto" name="foto" type="file" accept="image/jpeg,image/png,image/webp" />
          </FormField>
        </div>
      </div>

      <FormField label="Nome completo" htmlFor="nomeCompleto">
        <Input id="nomeCompleto" name="nomeCompleto" required defaultValue={person.nomeCompleto} />
      </FormField>

      <FormField
        label="Biografia (opcional)"
        htmlFor="biografia"
        description="Texto livre — conte quem foi essa pessoa."
      >
        <Textarea id="biografia" name="biografia" rows={4} defaultValue={person.biografia ?? ''} />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Data de nascimento (opcional)" htmlFor="dataNascimento">
          <Input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            defaultValue={toDateInputValue(person.dataNascimento)}
          />
        </FormField>
        <FormField label="Situação" htmlFor="lifeStatus">
          <Select id="lifeStatus" name="lifeStatus" defaultValue={person.lifeStatus ?? 'living'}>
            {PERSON_LIFE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {PERSON_LIFE_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {person.lifeStatus === 'deceased' && (
        <FormField label="Data de falecimento (opcional)" htmlFor="dataFalecimento">
          <Input
            id="dataFalecimento"
            name="dataFalecimento"
            type="date"
            defaultValue={toDateInputValue(person.dataFalecimento)}
          />
        </FormField>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Cidade (opcional)" htmlFor="cidade">
          <Input id="cidade" name="cidade" defaultValue={person.cidade ?? ''} />
        </FormField>
        <FormField label="Estado (opcional)" htmlFor="estado">
          <Input id="estado" name="estado" maxLength={2} defaultValue={person.estado ?? ''} />
        </FormField>
        <FormField label="País (opcional)" htmlFor="pais">
          <Input id="pais" name="pais" defaultValue={person.pais ?? ''} />
        </FormField>
      </div>

      <input type="hidden" name="visibility" value={person.visibility} />

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton label="Salvar dados" />
    </form>
  );
}

function FraternalRecordForm({ person }: { person: PersonCard }) {
  const boundAction = createPersonFraternalRecordAction.bind(null, person.id);
  const [state, formAction] = useActionState(boundAction, EMPTY_STATE);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Vínculos maçônicos e paramaçônicos</p>
      {person.fraternalRecords.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {person.fraternalRecords.map((record) => (
            <li
              key={record.id}
              className="border-border-soft flex items-center gap-2 rounded-md border p-2 text-sm"
            >
              <Badge variant="outline">{record.label}</Badge>
              {record.unidadeNome && <span>{record.unidadeNome}</span>}
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label="Tipo de vínculo" htmlFor="affiliationKind">
            <Select id="affiliationKind" name="affiliationKind" defaultValue="mason">
              {FRATERNAL_AFFILIATION_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {FRATERNAL_AFFILIATION_LABELS[kind]}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Tipo de unidade" htmlFor="unidadeTipo">
            <Select id="unidadeTipo" name="unidadeTipo" defaultValue="lodge">
              {FRATERNAL_UNIT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {FRATERNAL_UNIT_KIND_LABELS[kind]}
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <FormField
          label="Nome da Loja, Capítulo ou unidade"
          htmlFor="unidadeNome"
          description='Texto livre — ex.: "Estrela Rioverdense".'
        >
          <Input id="unidadeNome" name="unidadeNome" required maxLength={200} />
        </FormField>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FormField label="Número (opcional)" htmlFor="unidadeNumero">
            <Input id="unidadeNumero" name="unidadeNumero" maxLength={30} />
          </FormField>
          <FormField label="Cidade (opcional)" htmlFor="fraternalCidade">
            <Input id="fraternalCidade" name="cidade" />
          </FormField>
          <FormField label="Estado (opcional)" htmlFor="fraternalEstado">
            <Input id="fraternalEstado" name="estado" maxLength={2} />
          </FormField>
        </div>

        <FormField
          label="Sobre essa trajetória (opcional)"
          htmlFor="resumoLegado"
          description="Texto livre — ex.: fundação da Loja, cargos exercidos, memórias."
        >
          <Textarea id="resumoLegado" name="resumoLegado" rows={3} />
        </FormField>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton label="Adicionar vínculo" />
      </form>
    </div>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit" size="sm">
      {pending ? 'Salvando…' : label}
    </Button>
  );
}
