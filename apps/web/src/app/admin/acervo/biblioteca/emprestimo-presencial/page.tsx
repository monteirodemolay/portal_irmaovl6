import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PresentialCheckout } from '@/modules/library/components/presential-checkout';

export default async function LibraryPresentialLoanPage() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [items, copies, membersPage] = await Promise.all([
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.member.search({ tenantId: session.authContext.tenantId }, { limit: 1000 }),
  ]);
  const members = membersPage.items
    .filter((member) => member.userId)
    .map((member) => ({ id: member.id, nomeCompleto: member.nomeCompleto }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Empréstimo presencial</h1>
        <p className="text-muted text-sm">
          Escaneie a etiqueta do exemplar (ou busque a obra pelo nome), escolha o Irmão e registre a
          retirada na hora, como em um balcão.
        </p>
      </header>
      <PresentialCheckout items={items} copies={copies} members={members} />
    </div>
  );
}
