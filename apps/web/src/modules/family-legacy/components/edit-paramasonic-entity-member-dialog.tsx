'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import {
  PARAMASONIC_ENTITY_MEMBER_CATEGORIES,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_LABELS,
  PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS,
  PARAMASONIC_ENTITY_MEMBER_SITUATIONS,
  type ParamasonicEntityMemberCategory,
  type ParamasonicEntityMemberSituation,
} from '@vl6/shared';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Select,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import {
  updateParamasonicEntityMemberAction,
  type ParamasonicEntityActionState,
} from '../actions/paramasonic-entity-actions';
import type { PositionOption } from './add-paramasonic-entity-member-dialog';

export interface EditableParamasonicEntityMember {
  id: string;
  memberId: string | null;
  nomeCompleto: string;
  contato: string | null;
  cargo: string | null;
  categoria: ParamasonicEntityMemberCategory | null;
  situacao: ParamasonicEntityMemberSituation;
  dataIngresso: Date | null;
}

function toDateInputValue(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}

export function EditParamasonicEntityMemberDialog({
  entityId,
  member,
  positionOptions,
  /** Só quem tem `familyLegacy:manage` pode marcar ex-DeMolay / Past-Presidente do Conselho Consultivo. */
  allowFamilyLegacyActions,
}: {
  entityId: string;
  member: EditableParamasonicEntityMember;
  positionOptions: PositionOption[];
  allowFamilyLegacyActions: boolean;
}) {
  const boundAction = updateParamasonicEntityMemberAction.bind(null, entityId, member.id);
  const [state, formAction] = useActionState<ParamasonicEntityActionState, FormData>(boundAction, {
    error: null,
  });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.error === null) formRef.current?.reset();
  }, [state]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar integrante</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="flex flex-col gap-4">
          {member.memberId ? (
            <p className="text-muted text-sm">
              <span className="text-foreground font-medium">{member.nomeCompleto}</span> — Irmão
              vinculado, nome e contato não são editáveis aqui.
            </p>
          ) : (
            <>
              <FormField label="Nome completo" htmlFor="nomeCompleto">
                <Input
                  id="nomeCompleto"
                  name="nomeCompleto"
                  required
                  defaultValue={member.nomeCompleto}
                />
              </FormField>
              <FormField
                label="Contato"
                htmlFor="contato"
                description="Opcional — e-mail ou telefone."
              >
                <Input id="contato" name="contato" defaultValue={member.contato ?? ''} />
              </FormField>
            </>
          )}

          <FormField
            label="Cargo"
            htmlFor="cargo"
            description={
              positionOptions.length === 0
                ? 'Nenhum cargo cadastrado ainda — cadastre em "Cargos" antes de atribuir um.'
                : 'Opcional.'
            }
          >
            <Select id="cargo" name="cargo" defaultValue={member.cargo ?? ''}>
              <option value="">Sem cargo</option>
              {positionOptions.map((p) => (
                <option key={p.id} value={p.nome}>
                  {p.nome}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField
            label="Categoria"
            htmlFor="categoria"
            description="Opcional — classificação institucional do integrante."
          >
            <Select id="categoria" name="categoria" defaultValue={member.categoria ?? ''}>
              <option value="">Sem categoria definida</option>
              {(['membros_juvenis', 'membros_adultos', 'outros_vinculos_apoio'] as const).map(
                (group) => (
                  <optgroup
                    key={group}
                    label={PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS[group]}
                  >
                    {PARAMASONIC_ENTITY_MEMBER_CATEGORIES.filter(
                      (categoria) =>
                        PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY[categoria] === group,
                    ).map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {PARAMASONIC_ENTITY_MEMBER_CATEGORY_LABELS[categoria]}
                      </option>
                    ))}
                  </optgroup>
                ),
              )}
            </Select>
          </FormField>

          <FormField label="Situação" htmlFor="situacao">
            <Select id="situacao" name="situacao" required defaultValue={member.situacao}>
              {PARAMASONIC_ENTITY_MEMBER_SITUATIONS.map((situacao) => (
                <option key={situacao} value={situacao}>
                  {PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS[situacao]}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Data de ingresso" htmlFor="dataIngresso" description="Opcional.">
            <Input
              id="dataIngresso"
              name="dataIngresso"
              type="date"
              defaultValue={toDateInputValue(member.dataIngresso)}
            />
          </FormField>

          {member.memberId && allowFamilyLegacyActions && (
            <div className="border-border bg-surface flex flex-col gap-2 rounded-lg border border-dashed p-3">
              <p className="text-muted text-xs">
                Caso do Conselho Consultivo — marque o que se aplica a este Irmão (pode ser os
                dois):
              </p>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="marcarComoExDemolay" />
                Também foi DeMolay Ativo neste Capítulo — cria/atualiza a Afiliação em Família e
                Legado
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="marcarComoPastPresidenteConselho" />
                Foi Presidente do Conselho Consultivo (concede o título Past-Presidente do Conselho
                Consultivo)
              </label>
            </div>
          )}

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
