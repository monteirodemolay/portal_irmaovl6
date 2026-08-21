'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@vl6/ui';

/**
 * Botão de exclusão genérico (funcional, não bonito) — usado em Conteúdo
 * (Avisos/Agenda/Notícias/Frases) tanto pra exclusão lógica quanto física.
 * `confirmMessage` sempre passa por `window.confirm` antes de disparar a
 * Server Action; `redirectTo` navega depois de concluído (ex.: sair da
 * página de edição de um item que acabou de ser excluído). Sem
 * `redirectTo`, usa `window.location.reload()` em vez de `router.refresh()`
 * — na prática o refresh do App Router não repropaga o RSC atualizado pro
 * DataTable aqui (a linha excluída só some depois de um reload real), então
 * um reload garantido é mais confiável que a API "certa".
 */
export function DeleteButton({
  action,
  confirmMessage,
  label = 'Excluir',
  redirectTo,
  variant = 'outline',
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  redirectTo?: string;
  variant?: 'outline' | 'destructive';
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          await action();
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            window.location.reload();
          }
        });
      }}
    >
      {isPending ? 'Excluindo…' : label}
    </Button>
  );
}
