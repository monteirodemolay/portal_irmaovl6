'use client';

import { useFormStatus } from 'react-dom';
import type { NotificationChannel } from '@vl6/shared';
import { Button } from '@vl6/ui';
import { updateMyNotificationChannelsAction } from '../actions/notification-preference-actions';

const OPTIONAL_CHANNELS: { key: Exclude<NotificationChannel, 'interno'>; label: string }[] = [
  { key: 'email', label: 'E-mail' },
  { key: 'push', label: 'Notificação push' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'telegram', label: 'Telegram' },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar preferências'}
    </Button>
  );
}

export function NotificationPreferenceForm({
  canaisHabilitados,
}: {
  canaisHabilitados: NotificationChannel[];
}) {
  return (
    <form action={updateMyNotificationChannelsAction} className="flex flex-col gap-4">
      <div className="border-border bg-background flex items-center gap-2 rounded-lg border p-3 text-sm">
        <input type="checkbox" checked disabled className="h-4 w-4" />
        <div>
          <p className="font-medium">Central de Avisos (interno)</p>
          <p className="text-muted text-xs">
            Avisos oficiais, segurança e comunicações essenciais — sempre ativo.
          </p>
        </div>
      </div>
      {OPTIONAL_CHANNELS.map((channel) => (
        <label key={channel.key} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={`canal-${channel.key}`}
            className="h-4 w-4"
            defaultChecked={canaisHabilitados.includes(channel.key)}
          />
          {channel.label}
        </label>
      ))}
      <p className="text-muted text-xs">
        Canais externos ainda não enviam de fato (integração planejada) — a preferência já fica
        salva para quando estiverem disponíveis.
      </p>
      <div>
        <SubmitButton />
      </div>
    </form>
  );
}
