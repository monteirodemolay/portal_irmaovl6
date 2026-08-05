import Link from 'next/link';
import type { BoardPositionKey } from '@vl6/shared';
import {
  BOARD_POSITION_KEYS,
  BOARD_POSITION_LABELS,
  MEMBER_DEGREES,
  MEMBER_SITUATIONS,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type { Member } from '@vl6/domain';
import { Badge, Button, DataTable, EmptyState, Input, Select, type DataTableColumn } from '@vl6/ui';
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
  searchParams: Promise<{
    nome?: string;
    grau?: string;
    situacao?: string;
    cidade?: string;
    cim?: string;
    cargo?: string;
  }>;
}) {
  const session = await requirePagePermission('member:read');
  const filters = await searchParams;

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  const container = createServerContainer();
  const page = await container.useCases.searchMembers.execute(
    session.authContext,
    {
      nome: filters.nome || undefined,
      grau: filters.grau || undefined,
      situacao: filters.situacao || undefined,
      cidade: filters.cidade || undefined,
      cim: filters.cim || undefined,
      cargo: (filters.cargo || undefined) as BoardPositionKey | undefined,
    },
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
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href={`/api/v1/admin/members/export?${exportQuery}&format=xlsx`}>Exportar Excel</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/api/v1/admin/members/export?${exportQuery}&format=pdf`}>Exportar PDF</a>
          </Button>
          <Button asChild>
            <Link href="/admin/irmaos/novo">Novo Irmão</Link>
          </Button>
        </div>
      </div>

      <form className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Input name="nome" defaultValue={filters.nome} placeholder="Nome…" />
        <Input name="cim" defaultValue={filters.cim} placeholder="CIM…" />
        <Input name="cidade" defaultValue={filters.cidade} placeholder="Cidade…" />
        <Select name="grau" defaultValue={filters.grau ?? ''}>
          <option value="">Grau (todos)</option>
          {MEMBER_DEGREES.map((grau) => (
            <option key={grau} value={grau}>
              {grau}
            </option>
          ))}
        </Select>
        <Select name="situacao" defaultValue={filters.situacao ?? ''}>
          <option value="">Situação (todas)</option>
          {MEMBER_SITUATIONS.map((situacao) => (
            <option key={situacao} value={situacao}>
              {situacao}
            </option>
          ))}
        </Select>
        <Select name="cargo" defaultValue={filters.cargo ?? ''}>
          <option value="">Cargo atual (todos)</option>
          {BOARD_POSITION_KEYS.map((cargo) => (
            <option key={cargo} value={cargo}>
              {BOARD_POSITION_LABELS[cargo]}
            </option>
          ))}
        </Select>
        <div className="col-span-2 flex items-center gap-2 md:col-span-1">
          <Button type="submit" size="sm">
            Filtrar
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/irmaos">Limpar</Link>
          </Button>
        </div>
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
