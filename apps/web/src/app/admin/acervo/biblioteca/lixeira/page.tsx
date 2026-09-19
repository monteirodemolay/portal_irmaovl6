import { createServerContainer } from '@vl6/infra';
import { Badge, Card, CardContent, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { RestoreLibraryItemButton } from '@/modules/library/components/restore-library-item-button';

/**
 * Lixeira da Biblioteca — obras excluídas (exclusão "normal", que preserva
 * histórico) ficam recuperáveis aqui, sem precisar recatalogar nada: motivo,
 * capa, categoria, tudo continua salvo, só esperando a restauração. A
 * exclusão permanente (só Administrador) não passa por aqui — some de vez.
 */
export default async function LibraryTrashPage() {
  const session = await requirePagePermission('libraryItem:manage');
  const c = createServerContainer();
  const deleted = await c.repositories.libraryItem.listDeletedByTenant(
    session.authContext.tenantId,
  );
  const sorted = [...deleted].sort(
    (a, b) => (b.deletedAt?.getTime() ?? 0) - (a.deletedAt?.getTime() ?? 0),
  );

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="font-display text-2xl font-semibold">Lixeira</h1>
        <p className="text-muted text-sm">
          Obras excluídas por engano continuam aqui, prontas pra restaurar sem precisar cadastrar de
          novo — dados, exemplares e QR de etiqueta voltam exatamente como estavam.
        </p>
      </header>
      {sorted.length === 0 ? (
        <EmptyState title="Lixeira vazia" description="Nenhuma obra excluída no momento." />
      ) : (
        <ul className="grid gap-3">
          {sorted.map((item) => (
            <li key={item.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{item.titulo ?? 'Obra sem título'}</h2>
                    <p className="text-muted truncate text-xs">
                      {item.autor ?? 'Autoria não informada'}
                    </p>
                    {item.motivoExclusao && (
                      <p className="text-muted mt-1 text-xs">
                        Motivo: <span className="italic">{item.motivoExclusao}</span>
                      </p>
                    )}
                    {item.deletedAt && (
                      <Badge variant="outline" className="mt-2 text-[10px]">
                        Excluída em {item.deletedAt.toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                  <RestoreLibraryItemButton itemId={item.id} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
