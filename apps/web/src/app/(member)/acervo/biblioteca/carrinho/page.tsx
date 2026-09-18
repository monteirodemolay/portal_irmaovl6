import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { Button } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { LibraryCart } from '@/modules/library/components/library-cart';

export default async function LibraryCartPage() {
  const session = await requirePagePermission('libraryItem:read');
  const container = createServerContainer();
  const [items, events] = await Promise.all([
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    container.useCases.listUpcomingEvents.execute(session.authContext, { limit: 30 }),
  ]);
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-accent text-sm font-semibold uppercase tracking-widest">
          Biblioteca VL6
        </p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Carrinho de empréstimos</h1>
        <p className="text-muted">
          Envie várias obras no mesmo pacote e selecione uma sessão para retirada.
        </p>
      </header>
      <LibraryCart items={items} events={events.items} />
      <Button asChild variant="ghost" className="w-full sm:w-fit">
        <Link href="/acervo/biblioteca">← Continuar escolhendo</Link>
      </Button>
    </div>
  );
}
