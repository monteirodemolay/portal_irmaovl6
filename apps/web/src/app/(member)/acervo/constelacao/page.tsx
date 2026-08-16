import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { ARCHIVE_RELATION_TYPE_LABELS } from '@vl6/shared';
import { Compass, EmptyState } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { resolveRelationNode } from '@/modules/archive/lib/resolve-relation-node';

const MAX_RELATIONS = 150;

export default async function ArchiveConstellationPage() {
  const session = await requirePagePermission('archiveRelation:read');

  const container = createServerContainer();
  const relations = await container.useCases.listArchiveRelations.execute(session.authContext);

  const rows = (
    await Promise.all(
      relations.slice(0, MAX_RELATIONS).map(async (relation) => {
        const [origem, destino] = await Promise.all([
          resolveRelationNode(
            relation.origemTipo,
            relation.origemId,
            session.authContext,
            container,
          ),
          resolveRelationNode(
            relation.destinoTipo,
            relation.destinoId,
            session.authContext,
            container,
          ),
        ]);
        if (!origem || !destino) return null;
        return {
          id: relation.id,
          origem,
          destino,
          tipoLabel: ARCHIVE_RELATION_TYPE_LABELS[relation.tipo],
        };
      }),
    )
  ).filter((row): row is NonNullable<typeof row> => row !== null);

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader
        title="Constelação da Memória"
        description="O contexto que conecta pessoas, gestões, eventos, coleções e itens do Acervo — sempre disponível como esta lista completa, nunca só como desenho."
        backHref="/acervo"
      />

      <p className="text-muted max-w-2xl text-sm leading-6">
        Cada página do Acervo com relações cadastradas — um item, uma pessoa, uma gestão ou uma
        coleção — mostra sua própria Constelação local, com o mesmo par de gráfico e lista abaixo.
        Aqui está o índice completo de todas as relações já registradas.
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Compass size={22} />}
          title="Nenhuma relação registrada ainda"
          description="Relações entre registros do Acervo aparecerão aqui conforme forem cadastradas pela administração."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li key={row.id} className="border-border rounded-lg border p-4 text-sm">
              <Link href={row.origem.href} className="text-accent font-medium hover:underline">
                {row.origem.label}
              </Link>
              <span className="text-muted">
                {' '}
                ({row.origem.kindLabel}) — {row.tipoLabel} —{' '}
              </span>
              <Link href={row.destino.href} className="text-accent font-medium hover:underline">
                {row.destino.label}
              </Link>
              <span className="text-muted"> ({row.destino.kindLabel})</span>
            </li>
          ))}
        </ul>
      )}

      {relations.length > MAX_RELATIONS && (
        <p className="text-muted text-xs">
          Mostrando as {MAX_RELATIONS} relações mais recentes de {relations.length} no total.
        </p>
      )}
    </div>
  );
}
