'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Drawer, DrawerBody, DrawerContent, DrawerTitle } from '@vl6/ui';

/**
 * Casca cliente do perfil no Diretório — mesmo padrão de
 * `MemberEditDrawerShell` (admin): só dá `open`/`onOpenChange` ao `Drawer`
 * e fecha navegando pra trás (`router.back()`), o que devolve a URL pra
 * `/irmaos` e desmonta a rota interceptada, preservando o Diretório (busca,
 * filtros, scroll) intacto atrás do painel.
 */
export function MemberProfileDrawerShell({ children }: { children: ReactNode }) {
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
        <DrawerTitle className="sr-only">Perfil do Irmão</DrawerTitle>
        <DrawerBody>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
