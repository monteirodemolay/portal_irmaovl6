'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Notification } from '@vl6/domain';
import type { MemberDegree } from '@vl6/shared';
import { cn } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

/**
 * Menu do usuário no topo — substitui o antigo link único pra "Meu Espaço"
 * (aba retirada da navegação principal da Comunidade VL6). Abre ao passar o
 * mouse (`onMouseEnter`) e fecha sozinho ao tirar (`onMouseLeave`), além de
 * continuar alternável por clique/teclado (`onClick`/Enter no `<button>`)
 * pra quem navega sem mouse — antes era um `<details>` nativo só de clique,
 * que também deixava o cursor de texto aparecer sobre nome/cargo por não
 * ter `cursor-pointer` explícito no gatilho.
 */
export function TopbarUser({
  displayName,
  fotoUrl,
  roleLabel,
  email,
  grau,
  memberId,
  notifications,
  unreadCount,
}: {
  displayName: string;
  fotoUrl?: string | null;
  roleLabel: string;
  email: string;
  grau: MemberDegree | null;
  /** Id do cadastro de Irmão vinculado, quando existe — habilita "Ver meu perfil". */
  memberId?: string | null;
  notifications: Notification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
      <div
        className="relative hidden sm:block"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="hover:bg-background flex cursor-pointer items-center gap-2 rounded-lg p-1 text-left transition-colors"
        >
          <MemberAvatar fotoUrl={fotoUrl ?? null} nome={displayName} />
          <div className="leading-tight">
            <p className="max-w-[160px] truncate text-sm font-medium">{displayName}</p>
            {grau && <MemberDegreeBadge grau={grau} compact size="xs" className="my-0.5" />}
            <p className="text-muted truncate text-xs" title={email}>
              {roleLabel}
            </p>
          </div>
        </button>
        <nav
          className={cn(
            'border-border bg-surface absolute right-0 top-full z-30 mt-2 flex w-56 flex-col gap-0.5 rounded-lg border p-1.5 text-sm shadow-md transition-all duration-150',
            open ? 'visible translate-y-0 opacity-100' : 'invisible -translate-y-1 opacity-0',
          )}
        >
          {memberId && (
            <Link
              href={`/irmaos/${memberId}`}
              className="hover:bg-background rounded-md px-3 py-2 transition-colors"
            >
              Ver meu perfil
            </Link>
          )}
          <Link
            href="/irmaos/meu-espaco"
            className="hover:bg-background rounded-md px-3 py-2 transition-colors"
          >
            Editar meu perfil
          </Link>
          <Link
            href="/irmaos/meu-espaco?tab=empresa"
            className="hover:bg-background rounded-md px-3 py-2 transition-colors"
          >
            Gerenciar meus negócios
          </Link>
          <Link
            href="/irmaos/meu-espaco?tab=contatos"
            className="hover:bg-background rounded-md px-3 py-2 transition-colors"
          >
            Privacidade e contatos
          </Link>
          <Link
            href="/irmaos/configuracoes"
            className="hover:bg-background rounded-md px-3 py-2 transition-colors"
          >
            Configurações
          </Link>
          <div className="border-border-soft border-t px-1 pt-1.5">
            <LogoutButton className="w-full" />
          </div>
        </nav>
      </div>
      <div className="sm:hidden">
        <LogoutButton />
      </div>
    </>
  );
}
