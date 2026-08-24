'use server';

import { revalidatePath } from 'next/cache';
import type { NotificationChannel } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

/**
 * Preferências de comunicação — canal `interno` é sempre habilitado
 * (comunicações essenciais/segurança nunca dependem de escolha do
 * usuário); os demais são opcionais. O gateway externo (e-mail/push/
 * WhatsApp/Telegram) ainda é Noop (docs/architecture) — os toggles já
 * ficam salvos e prontos pra quando a integração real existir.
 */
export async function updateMyNotificationChannelsAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();

  const optional = (['email', 'push', 'whatsapp', 'telegram'] as const).filter(
    (canal) => formData.get(`canal-${canal}`) === 'on',
  );
  const canais: NotificationChannel[] = ['interno', ...optional];

  await container.useCases.updateNotificationPreference.execute(session.authContext, canais);

  revalidatePath('/irmaos/configuracoes');
}
