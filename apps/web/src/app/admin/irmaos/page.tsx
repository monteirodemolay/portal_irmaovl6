import Link from 'next/link';
import type { MEMBER_SITUATIONS } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type { Member } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

const SITUATION_VARIANT: Record<
  (typeof MEMBER_SITUATIONS)[number],
  'default' | 'success' | 'warning' | 'destructive'
> = {
  regular: 'success',
  irregular: 'warning',
  remido: 'default',
  inativo: 'default',
  falecido: 'destructive',
  transferido: 'default',
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ nome?: string }>;
}) {
  const session = await requirePagePermission('member:read');
  const { nome } = await searchParams;

  const container = createServerContainer();
  const page = await container.useCases.searchMembers.execute(
    session.authContext,
    { nome },
    { limit: 50 },
  );

  const columns: DataTableColumn<Member>[] = [
    {
      key: 'nome',
      header: 'Nome',
      cell: (m) => (
        <Link href={`/admin/irmaos/${m.id}`} className="block hover:underline">
          <p className="font-medium">{m.nomeCompleto}</p>
          {m.nomeMaconico && <p className="text-muted text-xs">{m.nomeMaconico}</p>}
        </Link>
      ),
    },
    { key: 'matricula', header: 'Matrícula', cell: (m) => m.matricula },
    { key: 'grau', header: 'Grau', cell: (m) => m.grau },
    {
      key: 'situacao',
      header: 'Situação',
      cell: (m) => <Badge variant={SITUATION_VARIANT[m.situacao]}>{m.situacao}</Badge>,
    },
    { key: 'email', header: 'E-mail', cell: (m) => m.email },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cadastro de Irmãos</h1>
          <p className="text-muted">{page.items.length} Irmãos encontrados</p>
        </div>
        <Button asChild>
          <Link href="/admin/irmaos/novo">Novo Irmão</Link>
        </Button>
      </div>

      <form className="flex max-w-sm gap-2">
        <input
          name="nome"
          defaultValue={nome}
          placeholder="Buscar por nome…"
          className="border-border bg-surface h-10 w-full rounded border px-3 text-sm"
        />
      </form>

      <DataTable
        columns={columns}
        rows={page.items}
        getRowId={(m) => m.id}
        emptyState={
          <EmptyState
            title="Nenhum Irmão cadastrado"
            description="Cadastre o primeiro Irmão da Loja para começar."
            action={
              <Button asChild size="sm">
                <Link href="/admin/irmaos/novo">Novo Irmão</Link>
              </Button>
            }
          />
        }
      />
    </div>
  );
}
