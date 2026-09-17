import type { ReactNode } from 'react';

/**
 * Estrutura de 3 colunas do novo layout do Perfil do Irmão (mock-up do
 * Administrador, `/tmp/claude-0/mockup/perfil-vl6`) — coluna de identidade
 * fixa à esquerda, conteúdo documental em cards no centro, linha do tempo à
 * direita. Mesmo componente serve o Irmão ativo (`PublicMemberProfileView`)
 * e o In Memoriam (`InMemoriamProfileView`): só o conteúdo de cada coluna
 * muda, a estrutura é idêntica (pedido explícito do Administrador).
 *
 * Responsividade em 3 estágios, replicando o mock-up (que usa breakpoints
 * próprios de 900px/1280px em vez dos passos padrão do Tailwind):
 * - `< 900px`: tudo empilhado numa coluna só (identidade → conteúdo →
 *   linha do tempo);
 * - `900–1280px`: 2 colunas (identidade + conteúdo), linha do tempo desce
 *   pra uma faixa abaixo do conteúdo central, ocupando as duas colunas;
 * - `≥ 1280px`: 3 colunas lado a lado, identidade e linha do tempo fixas
 *   (`sticky`) enquanto o conteúdo central rola.
 *
 * `layout: 'compact'` ("Ver como os outros veem") força 1 coluna
 * independente do viewport — nunca depende de nenhum breakpoint.
 */
export function ProfileShell({
  identity,
  main,
  timeline,
  layout = 'full',
}: {
  identity: ReactNode;
  main: ReactNode;
  timeline: ReactNode | null;
  layout?: 'full' | 'compact';
}) {
  if (layout === 'compact') {
    return (
      <div className="flex flex-col gap-6">
        {identity}
        {main}
        {timeline}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 min-[900px]:grid-cols-[280px_minmax(0,1fr)] min-[1280px]:grid-cols-[300px_minmax(0,1fr)_340px]">
      <aside className="flex min-w-0 flex-col gap-6 min-[1280px]:sticky min-[1280px]:top-6 min-[1280px]:self-start">
        {identity}
      </aside>
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      {timeline && (
        <aside className="min-w-0 min-[900px]:col-span-2 min-[1280px]:sticky min-[1280px]:top-6 min-[1280px]:col-span-1 min-[1280px]:self-start">
          {timeline}
        </aside>
      )}
    </div>
  );
}
