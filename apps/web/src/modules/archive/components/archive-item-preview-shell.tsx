'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { Drawer, DrawerBody, DrawerContent, DrawerTitle } from '@vl6/ui';

/**
 * Casca cliente da prévia interceptada do Item do Acervo — mesmo padrão de
 * `MemberEditDrawerShell` (admin/pessoas/irmaos): só controla abrir/fechar
 * do `Drawer`; `router.back()` devolve a URL para a lista de origem e
 * desmonta a rota interceptada. O conteúdo (`ArchiveItemContent`, Server
 * Component) é passado como `children`.
 */
export function ArchiveItemPreviewShell({
  children,
  titulo,
}: {
  children: ReactNode;
  titulo: string;
}) {
  const router = useRouter();

  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <DrawerContent className="max-w-2xl">
        <DrawerTitle className="sr-only">{titulo}</DrawerTitle>
        <DrawerBody>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
