'use client';

import { useActionState, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  FAMILY_DISPLAY_GROUP_LABELS,
  FAMILY_DISPLAY_GROUPS,
  FAMILY_SOURCE_KINDS,
  FAMILY_SOURCE_KIND_LABELS,
  FAMILY_VISIBILITY_LEVELS,
  FAMILY_VISIBILITY_LABELS,
  PERSON_FRATERNAL_LINK_STATUSES,
  PERSON_FRATERNAL_LINK_STATUS_LABELS,
} from '@vl6/shared';
import type { FamilyPersonCandidate } from '@vl6/domain';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Check,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Plus,
  Search,
  Select,
  Users,
  X,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import {
  DIRECT_LINK_KINDS,
  DIRECT_LINK_LABELS,
  type DirectLinkKind,
} from '../lib/family-display-groups';
import type { OwnerFamilyNetworkDTO } from '../lib/load-owner-family-network-dto';
import {
  addFamilyMemberAction,
  confirmFamilyRelationshipAction,
  declineFamilyRelationshipAction,
  removeFamilyRelationshipAction,
  searchFamilyPersonCandidatesAction,
  type FamilyLegacyActionState,
} from '../actions/family-legacy-actions';

const EMPTY_STATE: FamilyLegacyActionState = { error: null };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')).toUpperCase();
}

export function FamilyLegacyCard({ network }: { network: OwnerFamilyNetworkDTO }) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <FormSectionCard
      icon={Users}
      title="Família e Legado"
      description="Registre vínculos familiares e preserve a trajetória das gerações que fazem parte da sua história."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Vínculos registrados" value={network.summary.vinculosRegistrados} />
        <SummaryTile label="Gerações conhecidas" value={network.summary.geracoesConhecidas} />
        <SummaryTile label="Gerações maçônicas" value={network.summary.geracoesMaconicas} />
        <SummaryTile label="Confirmações pendentes" value={network.summary.confirmacoesPendentes} />
      </div>

      {network.pendingConfirmations.length > 0 && (
        <div className="border-border-soft flex flex-col gap-2 rounded-md border p-3">
          <p className="text-sm font-medium">Aguardando sua confirmação</p>
          {network.pendingConfirmations.map((pending) => (
            <PendingConfirmationRow key={pending.relationshipId} pending={pending} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {FAMILY_DISPLAY_GROUPS.filter((group) => network.groups[group].length > 0).map((group) => (
          <div key={group} className="flex flex-col gap-2">
            <p className="text-muted text-xs font-semibold uppercase tracking-wide">
              {FAMILY_DISPLAY_GROUP_LABELS[group]}
            </p>
            <div className="flex flex-col gap-2">
              {network.groups[group].map((person) => (
                <PersonRow key={person.key} person={person} />
              ))}
            </div>
          </div>
        ))}
        {network.summary.vinculosRegistrados === 0 && (
          <p className="text-muted text-sm">Nenhum vínculo familiar registrado ainda.</p>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="w-fit">
            <Plus size={16} /> Adicionar familiar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar familiar</DialogTitle>
            <DialogDescription>
              Pesquise antes de cadastrar — assim evitamos duplicar uma pessoa que já existe no
              Portal.
            </DialogDescription>
          </DialogHeader>
          <AddFamilyMemberForm network={network} onDone={() => setDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </FormSectionCard>
  );
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border-soft rounded-md border p-3 text-center">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-muted text-xs">{label}</p>
    </div>
  );
}

function PendingConfirmationRow({
  pending,
}: {
  pending: OwnerFamilyNetworkDTO['pendingConfirmations'][number];
}) {
  const [confirmState, confirmAction] = useActionState(
    confirmFamilyRelationshipAction,
    EMPTY_STATE,
  );
  const [declineState, declineAction] = useActionState(
    declineFamilyRelationshipAction,
    EMPTY_STATE,
  );

  return (
    <div className="flex flex-col gap-1 text-sm">
      <p>
        O Irmão <strong>{pending.otherPartyName}</strong> informou vínculo familiar com você (
        {pending.relationLabel}). Confira antes de confirmar.
      </p>
      <div className="flex gap-2">
        <form action={confirmAction}>
          <input type="hidden" name="relationshipId" value={pending.relationshipId} />
          <Button type="submit" size="sm" variant="outline" className="gap-1">
            <Check size={14} /> Confirmar
          </Button>
        </form>
        <form action={declineAction}>
          <input type="hidden" name="relationshipId" value={pending.relationshipId} />
          <Button type="submit" size="sm" variant="outline" className="gap-1">
            <X size={14} /> Recusar
          </Button>
        </form>
      </div>
      {(confirmState.error || declineState.error) && (
        <p className="text-xs text-red-600">{confirmState.error ?? declineState.error}</p>
      )}
    </div>
  );
}

function PersonRow({
  person,
}: {
  person: OwnerFamilyNetworkDTO['groups'][keyof OwnerFamilyNetworkDTO['groups']][number];
}) {
  const [state, removeAction] = useActionState(removeFamilyRelationshipAction, EMPTY_STATE);

  return (
    <div className="border-border-soft flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="flex items-center gap-3">
        <Avatar>
          <AvatarFallback>{initials(person.nomeCompleto)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <p className="text-sm font-medium">{person.nomeCompleto}</p>
          <p className="text-muted text-xs">
            {person.parentesco}
            {person.ladoLinhagem !== 'unknown' &&
              ` · lado ${person.ladoLinhagem === 'maternal' ? 'materno' : 'paterno'}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {person.lifeStatus === 'deceased' && <Badge variant="outline">In Memoriam</Badge>}
        {person.confirmationStatus === 'pending' && (
          <Badge variant="warning">Aguardando confirmação</Badge>
        )}
        {person.confirmationStatus === 'declined' && <Badge variant="destructive">Recusado</Badge>}
        {person.direct && person.relationshipId && (
          <form action={removeAction}>
            <input type="hidden" name="relationshipId" value={person.relationshipId} />
            <Button type="submit" size="sm" variant="ghost" title="Remover vínculo">
              <X size={14} />
            </Button>
          </form>
        )}
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </div>
  );
}

function AddFamilyMemberForm({
  network,
  onDone,
}: {
  network: OwnerFamilyNetworkDTO;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(addFamilyMemberAction, EMPTY_STATE);
  const [query, setQuery] = useState('');
  const [candidates, setCandidates] = useState<FamilyPersonCandidate[]>([]);
  const [selected, setSelected] = useState<FamilyPersonCandidate | null>(null);
  const [dismissedCandidates, setDismissedCandidates] = useState(false);
  const [linkKind, setLinkKind] = useState<DirectLinkKind>('mae');

  useEffect(() => {
    if (selected) return;
    if (query.trim().length < 3) {
      setCandidates([]);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      searchFamilyPersonCandidatesAction(query).then((results) => {
        if (active) setCandidates(results);
      });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [query, selected]);

  useEffect(() => {
    if (!state.error && state !== EMPTY_STATE) onDone();
  }, [state, onDone]);

  const hasUnanalyzedCandidates = candidates.length > 0 && !selected && !dismissedCandidates;
  const showCreationFields = !selected && (dismissedCandidates || candidates.length === 0);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {network.anchorOptions.length > 1 && (
        <FormField label="Vínculo é com quem?" htmlFor="anchorRef">
          <Select
            id="anchorRef"
            name="anchorRef"
            defaultValue={`${network.anchorOptions[0]!.kind}|${network.anchorOptions[0]!.id}`}
          >
            {network.anchorOptions.map((option) => (
              <option key={`${option.kind}|${option.id}`} value={`${option.kind}|${option.id}`}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>
      )}

      <FormField label="Qual o vínculo direto?" htmlFor="linkKind">
        <Select
          id="linkKind"
          name="linkKind"
          value={linkKind}
          onChange={(event) => setLinkKind(event.target.value as DirectLinkKind)}
        >
          {DIRECT_LINK_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {DIRECT_LINK_LABELS[kind]}
            </option>
          ))}
        </Select>
      </FormField>
      {linkKind === 'outro' && (
        <FormField label="Descreva o parentesco" htmlFor="declaredLabel">
          <Input id="declaredLabel" name="declaredLabel" required maxLength={100} />
        </FormField>
      )}

      <FormField label="Nome da pessoa" htmlFor="nomeCompleto">
        <div className="relative">
          <Search size={14} className="text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <Input
            id="nomeCompleto"
            name={selected ? undefined : 'nomeCompleto'}
            className="pl-8"
            value={selected ? selected.nomeCompleto : query}
            disabled={!!selected}
            onChange={(event) => setQuery(event.target.value)}
            required={!selected}
          />
        </div>
      </FormField>

      {selected && (
        <div className="border-border-soft flex items-center justify-between rounded-md border p-2 text-sm">
          <span>
            Vinculando pessoa já existente ({selected.kind === 'member' ? 'Irmão' : 'já cadastrada'}
            ): <strong>{selected.nomeCompleto}</strong>
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              setSelected(null);
              setDismissedCandidates(false);
            }}
          >
            Trocar
          </Button>
        </div>
      )}
      <input
        type="hidden"
        name="existingRef"
        value={selected ? `${selected.kind}|${selected.id}` : ''}
      />

      {hasUnanalyzedCandidates && (
        <div className="border-border-soft flex flex-col gap-1 rounded-md border p-2">
          <p className="text-muted text-xs">
            Encontramos pessoas parecidas — confira antes de cadastrar:
          </p>
          {candidates.map((candidate) => (
            <button
              key={`${candidate.kind}|${candidate.id}`}
              type="button"
              className="hover:bg-primary/5 flex items-center justify-between rounded px-2 py-1.5 text-left text-sm"
              onClick={() => setSelected(candidate)}
            >
              <span>{candidate.nomeCompleto}</span>
              <span className="text-muted text-xs">
                {candidate.kind === 'member' ? 'Irmão' : 'Já cadastrado(a)'}
              </span>
            </button>
          ))}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="w-fit"
            onClick={() => setDismissedCandidates(true)}
          >
            Nenhuma dessas — cadastrar pessoa nova
          </Button>
        </div>
      )}

      {showCreationFields && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Data de nascimento (opcional)" htmlFor="dataNascimento">
              <Input id="dataNascimento" name="dataNascimento" type="date" />
            </FormField>
            <FormField label="Situação" htmlFor="lifeStatus">
              <Select id="lifeStatus" name="lifeStatus" defaultValue="living">
                <option value="living">Vivo(a)</option>
                <option value="deceased">In Memoriam / Oriente Eterno</option>
                <option value="unknown">Não sei informar</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Vínculo maçônico ou paramaçônico" htmlFor="fraternalLinkStatus">
            <Select id="fraternalLinkStatus" name="fraternalLinkStatus" defaultValue="unknown">
              {PERSON_FRATERNAL_LINK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {PERSON_FRATERNAL_LINK_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </FormField>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Fonte da informação" htmlFor="sourceKind">
          <Select id="sourceKind" name="sourceKind" defaultValue="self_declaration">
            {FAMILY_SOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {FAMILY_SOURCE_KIND_LABELS[kind]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Visibilidade" htmlFor="visibility">
          <Select id="visibility" name="visibility" defaultValue="private">
            {FAMILY_VISIBILITY_LEVELS.filter((level) => level !== 'archive').map((level) => (
              <option key={level} value={level}>
                {FAMILY_VISIBILITY_LABELS[level]}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton disabled={hasUnanalyzedCandidates} />
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
