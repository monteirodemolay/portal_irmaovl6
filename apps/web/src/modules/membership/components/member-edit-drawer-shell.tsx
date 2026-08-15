'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Drawer, DrawerBody, DrawerContent, DrawerTitle } from '@vl6/ui';

/**
 * Casca cliente do painel de edição — só existe pra dar `open`/`onOpenChange`
 * ao `Drawer` (Radix precisa disso) e fechar navegando pra trás
 * (`router.back()`), o que devolve a URL pra `/admin/pessoas/irmaos` e
 * desmonta a rota interceptada. Todo o conteúdo real (`MemberEditPanel`,
 * Server Component) é passado como `children` — a busca de dados nunca
 * acontece aqui, só o controle de abrir/fechar.
 */
export function MemberEditDrawerShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DrawerContent>
        {/* O nome do Irmão já aparece visível dentro do painel — este
            título só existe pra leitores de tela (Radix exige um
            `Dialog.Title` associado via aria-labelledby). */}
        <DrawerTitle className="sr-only">Editar Irmão</DrawerTitle>
        <DrawerBody>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
