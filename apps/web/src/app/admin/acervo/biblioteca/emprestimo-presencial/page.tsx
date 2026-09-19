import type { Viewport } from 'next';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { PresentialCheckout } from '@/modules/library/components/presential-checkout';

/**
 * Só nesta tela: trava o zoom do navegador. É a tela mais manuseada com o
 * celular na mão apontando a câmera pro QR — um duplo toque ou pinça sem
 * querer (comum enquanto se mira o exemplar) dá zoom na página inteira e
 * ela fica com a margem cortada até o Bibliotecário lembrar de dar zoom out
 * manualmente. O resto do Portal continua com zoom livre normalmente.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function LibraryPresentialLoanPage() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const [items, copies, membersPage] = await Promise.all([
    c.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    c.repositories.libraryCirculation.listCopiesByTenant(session.authContext.tenantId),
    c.repositories.member.search(
      { tenantId: session.authContext.tenantId, situacao: 'ativo' },
      { limit: 2000 },
    ),
  ]);
  // Irmãos ativos entram todos na busca, tenham ou não conta no Portal — sem
  // conta, o empréstimo continua registrado e rastreável pelo Bibliotecário,
  // só não aparece em "Meus empréstimos" pro próprio Irmão acompanhar.
  const members = membersPage.items.map((member) => ({
    id: member.id,
    nomeCompleto: member.nomeCompleto,
    temAcessoPortal: Boolean(member.userId),
  }));

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Balcão</h1>
        <p className="text-muted text-sm">
          Escolha "Retirar" ou "Devolver" e aponte a câmera pro QR da etiqueta — igual a um
          autoatendimento: escaneou, já está registrado.
        </p>
      </header>
      <PresentialCheckout items={items} copies={copies} members={members} />
    </div>
  );
}
