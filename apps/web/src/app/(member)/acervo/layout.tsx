import type { ReactNode } from 'react';

/**
 * Slot paralelo `@preview` — existe só para permitir a rota interceptada
 * `@preview/(.)item/[id]` abrir o Item do Acervo como prévia em painel
 * lateral por cima da lista de origem (pesquisa, descoberta etc.), sem
 * navegação de página cheia. Em qualquer outra rota deste segmento —
 * inclusive a própria `/acervo` sem item selecionado —
 * `@preview/default.tsx` devolve `null` e este layout se comporta como se
 * não existisse. Mesmo padrão já usado em `admin/pessoas/irmaos`.
 */
export default function AcervoLayout({
  children,
  preview,
}: {
  children: ReactNode;
  preview: ReactNode;
}) {
  return (
    <>
      {children}
      {preview}
    </>
  );
}
