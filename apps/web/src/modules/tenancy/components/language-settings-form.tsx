'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { SUPPORTED_LOCALES, type Locale } from '@vl6/shared';
import { Button, Select } from '@vl6/ui';
import { useDictionary } from '@/lib/i18n/dictionary-context';
import {
  updateTenantLanguageAction,
  type UpdateTenantLanguageActionState,
} from '../actions/tenant-settings-actions';

const INITIAL_STATE: UpdateTenantLanguageActionState = { error: null, success: false };

const LOCALE_LABEL: Record<Locale, string> = { 'pt-BR': 'Português (Brasil)', en: 'English' };

export function LanguageSettingsForm({ currentLocale }: { currentLocale: Locale }) {
  const [state, formAction] = useActionState(updateTenantLanguageAction, INITIAL_STATE);
  const { settings: t } = useDictionary();

  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3">
      <label htmlFor="idiomaPadrao" className="text-sm font-medium">
        {t.languageLabel}
      </label>
      <Select id="idiomaPadrao" name="idiomaPadrao" defaultValue={currentLocale}>
        {SUPPORTED_LOCALES.map((locale) => (
          <option key={locale} value={locale}>
            {LOCALE_LABEL[locale]}
          </option>
        ))}
      </Select>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.success && <p className="text-sm text-green-700">✓</p>}
      <SubmitButton label={t.saveButton} savingLabel={t.saving} />
    </form>
  );
}

function SubmitButton({ label, savingLabel }: { label: string; savingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="sm" className="w-fit">
      {pending ? savingLabel : label}
    </Button>
  );
}
