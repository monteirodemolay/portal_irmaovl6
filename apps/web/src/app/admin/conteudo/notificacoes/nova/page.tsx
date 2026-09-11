import { requirePagePermission } from '@/lib/auth/require-permission';
import { SendTargetedNotificationForm } from '@/modules/notification/components/send-targeted-notification-form';

/**
 * Envio manual de notificação pessoal pra um Irmão específico ou um grupo
 * — diferente do Comunicado (`/admin/conteudo/avisos`, sempre pra todos os
 * usuários ativos), aqui o alcance é escolhido a dedo pra um propósito
 * pontual (ex.: cobrar um documento pendente de um grupo específico).
 */
export default async function SendTargetedNotificationPage() {
  await requirePagePermission('notification:manage');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Notificação pessoal</h1>
        <p className="text-muted max-w-lg text-sm">
          Envie uma notificação só pra quem você escolher — um Irmão específico ou um grupo. Pra um
          aviso oficial pra todos, use os Comunicados.
        </p>
      </div>
      <SendTargetedNotificationForm />
    </div>
  );
}
