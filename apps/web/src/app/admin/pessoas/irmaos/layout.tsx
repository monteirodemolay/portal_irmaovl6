import type { ReactNode } from 'react';

/**
 * Slot paralelo `@drawer` — só existe pra permitir a rota interceptada
 * `@drawer/(.)[memberId]` abrir a edição de um Irmão como painel lateral
 * por cima da listagem, sem navegação de página cheia. Em qualquer outra
 * rota deste segmento (`/importar`, `/novo`, ou a própria listagem sem
 * nenhum Irmão selecionado), `@drawer/default.tsx` devolve `null` e este
 * layout se comporta como se não existisse.
 */
export default function IrmaosLayout({
  children,
  drawer,
}: {
  children: ReactNode;
  drawer: ReactNode;
}) {
  return (
    <>
      {children}
      {drawer}
    </>
  );
}
