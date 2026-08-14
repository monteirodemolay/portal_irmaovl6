'use client';

import { useActionState, useState, type ComponentType } from 'react';
import { useFormStatus } from 'react-dom';
import { Button, Eye, Lock, Switch } from '@vl6/ui';
import {
  updatePublicationSettingsAction,
  type CentralActionState,
} from '../../actions/central-actions';

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

export interface VisibilityToggleItem {
  key: string;
  label: string;
  icon: IconType;
  defaultChecked: boolean;
}

function ToggleRow({
  name,
  label,
  icon: Icon,
  defaultChecked,
}: VisibilityToggleItem & { name: string }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={16} strokeWidth={1.75} className="text-muted shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span
          className={
            checked
              ? 'text-primary flex items-center gap-1 text-xs font-medium'
              : 'text-muted flex items-center gap-1 text-xs'
          }
        >
          {checked ? <Eye size={13} /> : <Lock size={13} />}
          {checked ? 'Visível' : 'Privado'}
        </span>
        <Switch
          name={name}
          defaultChecked={defaultChecked}
          onChange={(event) => setChecked(event.target.checked)}
          aria-label={label}
        />
      </span>
    </label>
  );
}

/**
 * Um `<form>` completo por grupo de visibilidade (blocks/contacts/
 * externalLinks) — cada card do "Meu Espaço" que mexe em privacidade edita
 * só o grupo relevante (ver `updatePublicationSettingsAction`). O marcador
 * `<group>.__present` avisa a action que este grupo faz parte da
 * submissão, já que um `<input type="checkbox">` desmarcado nunca aparece
 * no FormData por conta própria.
 */
export function VisibilityMiniForm({
  group,
  items,
  submitLabel = 'Salvar visibilidade',
}: {
  group: 'blocks' | 'contacts' | 'externalLinks';
  items: VisibilityToggleItem[];
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState<CentralActionState, FormData>(
    updatePublicationSettingsAction,
    { error: null },
  );

  return (
    <form action={formAction} className="divide-border flex flex-col divide-y">
      <input type="hidden" name={`${group}.__present`} value="1" />
      {items.map((item) => (
        <ToggleRow
          key={item.key}
          name={`${group}.${item.key}`}
          label={item.label}
          icon={item.icon}
          defaultChecked={item.defaultChecked}
        />
      ))}
      {state.error && <p className="pt-2 text-sm text-red-600">{state.error}</p>}
      <div className="pt-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="sm" disabled={pending}>
      {pending ? 'Salvando…' : label}
    </Button>
  );
}
