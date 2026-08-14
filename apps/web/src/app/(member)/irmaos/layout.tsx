import type { ReactNode } from 'react';
import { Users } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { TabNav } from '@/components/layout/tab-nav';

export default async function IrmaosLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <Users size={22} strokeWidth={1.75} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-semibold">Irmãos</h1>
          <p className="text-muted text-sm">
            Encontre pessoas, conhecimentos, profissões e atividades compartilhadas pelos Irmãos da
            Loja — e organize o que você compartilha no seu próprio espaço.
          </p>
        </div>
      </div>

      <TabNav
        items={[
          { href: '/irmaos', label: 'Diretório' },
          { href: '/irmaos/meu-espaco', label: 'Meu Espaço' },
        ]}
      />

      {children}
    </div>
  );
}
