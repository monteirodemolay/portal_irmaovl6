'use client';

import { useEffect, useState } from 'react';
import { Button, Palette, Switch } from '@vl6/ui';

type ThemeChoice = 'system' | 'light' | 'dark';
type FontScale = 'small' | 'normal' | 'large';

interface PersonalizationState {
  theme: ThemeChoice;
  fontScale: FontScale;
  highContrast: boolean;
  reduceMotion: boolean;
}

const STORAGE_KEY = 'vl6:personalizacao';

const DEFAULT_STATE: PersonalizationState = {
  theme: 'system',
  fontScale: 'normal',
  highContrast: false,
  reduceMotion: false,
};

function applyPreferences(value: PersonalizationState) {
  const root = document.documentElement;

  if (value.theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', value.theme);

  root.setAttribute('data-font-scale', value.fontScale);
  root.toggleAttribute('data-high-contrast', value.highContrast);
  root.toggleAttribute('data-reduce-motion', value.reduceMotion);
}

export function PersonalizationPreferences() {
  const [value, setValue] = useState<PersonalizationState>(DEFAULT_STATE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as Partial<PersonalizationState>) : {};
      const restored: PersonalizationState = {
        theme:
          parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system'
            ? parsed.theme
            : 'system',
        fontScale:
          parsed.fontScale === 'small' ||
          parsed.fontScale === 'large' ||
          parsed.fontScale === 'normal'
            ? parsed.fontScale
            : 'normal',
        highContrast: Boolean(parsed.highContrast),
        reduceMotion: Boolean(parsed.reduceMotion),
      };
      setValue(restored);
      applyPreferences(restored);
    } catch {
      applyPreferences(DEFAULT_STATE);
    }
  }, []);

  function update(next: Partial<PersonalizationState>) {
    setSaved(false);
    setValue((current) => {
      const merged = { ...current, ...next };
      applyPreferences(merged);
      return merged;
    });
  }

  function save() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    if (value.theme === 'system') {
      document.cookie = 'theme=; Path=/; Max-Age=0; SameSite=Lax';
    } else {
      document.cookie = 'theme=' + value.theme + '; Path=/; Max-Age=31536000; SameSite=Lax';
    }
    applyPreferences(value);
    setSaved(true);
  }

  function reset() {
    window.localStorage.removeItem(STORAGE_KEY);
    document.cookie = 'theme=; Path=/; Max-Age=0; SameSite=Lax';
    setValue(DEFAULT_STATE);
    applyPreferences(DEFAULT_STATE);
    setSaved(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Palette size={18} className="text-primary" />
        <div>
          <p className="text-sm font-semibold">Aparência e acessibilidade</p>
          <p className="text-muted text-xs">
            Preferências aplicadas neste dispositivo e navegador.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Tema</legend>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['light', 'Claro'],
              ['dark', 'Escuro'],
              ['system', 'Sistema'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => update({ theme: key })}
                className={
                  value.theme === key
                    ? 'bg-primary text-white rounded-lg px-3 py-2 text-xs font-semibold'
                    : 'border-border bg-surface rounded-lg border px-3 py-2 text-xs font-medium'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Tamanho do texto</legend>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['small', 'A−'],
              ['normal', 'Normal'],
              ['large', 'A+'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => update({ fontScale: key })}
                className={
                  value.fontScale === key
                    ? 'bg-primary text-white rounded-lg px-3 py-2 text-xs font-semibold'
                    : 'border-border bg-surface rounded-lg border px-3 py-2 text-xs font-medium'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="divide-border flex flex-col divide-y">
        <label className="flex items-center justify-between gap-4 py-3">
          <span>
            <span className="block text-sm font-medium">Contraste reforçado</span>
            <span className="text-muted block text-xs">
              Aumenta a separação entre textos, fundos e bordas.
            </span>
          </span>
          <Switch
            checked={value.highContrast}
            onChange={(event) => update({ highContrast: event.target.checked })}
          />
        </label>

        <label className="flex items-center justify-between gap-4 py-3">
          <span>
            <span className="block text-sm font-medium">Reduzir animações</span>
            <span className="text-muted block text-xs">
              Diminui transições e efeitos de movimento do Portal.
            </span>
          </span>
          <Switch
            checked={value.reduceMotion}
            onChange={(event) => update({ reduceMotion: event.target.checked })}
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={save}>
          Salvar neste dispositivo
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={reset}>
          Restaurar padrão
        </Button>
        {saved && <span className="text-xs text-emerald-700">Preferências salvas.</span>}
      </div>
    </div>
  );
}
