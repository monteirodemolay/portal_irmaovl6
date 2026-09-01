import Link from 'next/link';
import type { Notification } from '@vl6/domain';
import type { MemberDegree } from '@vl6/shared';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { LogoutButton } from '@/modules/identity-access/components/logout-button';
import { NotificationCenter } from '@/modules/notification/components/notification-center';

/**
 * Menu do usuário no topo — substitui o antigo link único pra "Meu Espaço"
 * (aba retirada da navegação principal da Comunidade VL6). Fallback
 * deliberadamente simples: `<details>/<summary>` nativo em vez de um
 * componente de dropdown novo (não existe um em `@vl6/ui` hoje e criar um
 * sistema de menu genérico está fora do escopo desta unificação) —
 * continua acessível por teclado/clique e fecha ao perder foco/clicar fora
 * por comportamento nativo do elemento.
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
  return (
    <>
      <NotificationCenter notifications={notifications} unreadCount={unreadCount} />
      <details className="group relative hidden sm:block">
        <summary className="hover:bg-background flex list-none items-center gap-2 rounded-lg p-1 transition-colors [&::-webkit-details-marker]:hidden">
          <MemberAvatar fotoUrl={fotoUrl ?? null} nome={displayName} />
          <div className="leading-tight">
            <p className="max-w-[160px] truncate text-sm font-medium">{displayName}</p>
            {grau && <MemberDegreeBadge grau={grau} compact size="xs" className="my-0.5" />}
            <p className="text-muted truncate text-xs" title={email}>
              {roleLabel}
            </p>
          </div>
        </summary>
        <nav className="border-border bg-surface absolute right-0 top-full z-30 mt-2 flex w-56 flex-col gap-0.5 rounded-lg border p-1.5 text-sm shadow-lg">
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
      </details>
      <div className="sm:hidden">
        <LogoutButton />
      </div>
    </>
  );
}
