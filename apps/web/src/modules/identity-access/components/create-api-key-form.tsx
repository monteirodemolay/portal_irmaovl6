'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { PermissionKey } from '@vl6/shared';
import { Button, Input } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { useDictionary } from '@/lib/i18n/dictionary-context';
import { createApiKeyAction, type CreateApiKeyActionState } from '../actions/api-key-actions';

const INITIAL_STATE: CreateApiKeyActionState = { error: null, plainTextKey: null };

export function CreateApiKeyForm({
  availablePermissions,
}: {
  availablePermissions: readonly PermissionKey[];
}) {
  const [state, formAction] = useActionState(createApiKeyAction, INITIAL_STATE);
  const { integrations: t } = useDictionary();

  if (state.plainTextKey) {
    return (
      <div className="border-accent/40 bg-accent/10 flex flex-col gap-3 rounded border p-4 text-sm">
        <p>{t.keyCreatedNotice}</p>
        <p className="break-all rounded border bg-white/60 p-2 font-mono text-xs">
          {state.plainTextKey}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <FormField label={t.formNameLabel} htmlFor="nome" description={t.formNameDescription}>
        <Input id="nome" name="nome" required />
      </FormField>

      <fieldset className="flex flex-col gap-2">
        <legend className="font-display mb-1 text-sm font-semibold">
          {t.formPermissionsLegend}
        </legend>
        {availablePermissions.map((permission) => (
          <label key={permission} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="permissoes" value={permission} />
            <span className="font-mono text-xs">{permission}</span>
          </label>
        ))}
      </fieldset>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  const { integrations: t } = useDictionary();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? t.formSubmitting : t.formSubmit}
    </Button>
  );
}
