import Link from 'next/link';
import type { BoardPositionKey } from '@vl6/shared';
import {
  BOARD_POSITION_KEYS,
  BOARD_POSITION_LABELS,
  MEMBER_DEGREES,
  MEMBER_SITUATION_STATUSES,
  MEMBER_SITUATION_STATUS_LABELS,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { hasPermission } from '@vl6/domain';
import type { Member } from '@vl6/domain';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Pagination,
  Select,
  type DataTableColumn,
} from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { MemberAvatar } from '@/components/membership/member-avatar';
import { MEMBER_DEGREE_LABELS } from '@/lib/membership/member-degree-label';
import {
  USER_STATUS_LABEL,
  USER_STATUS_VARIANT,
} from '@/modules/identity-access/user-status-labels';

const SITUATION_VARIANT: Record<
  (typeof MEMBER_SITUATION_STATUSES)[number],
  'default' | 'success' | 'warning' | 'destructive'
> = {
  ativo: 'success',
  licenciado: 'warning',
  suspenso: 'warning',
  desligado: 'default',
  falecido: 'destructive',
};

const PAGE_SIZE = 50;
/** Sentinela pro histórico de páginas — representa "página 1" (sem cursor). */
const NO_CURSOR = '_';

function parseCursorHistory(h: string | undefined): string[] {
  return h ? h.split(',').filter(Boolean) : [];
}

/** Monta a URL de uma página (filtros atuais + cursor/histórico), preservando os filtros de busca. */
function buildPageHref(
  filters: Record<string, string | undefined>,
  cursor: string | undefined,
  history: string[],
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  if (cursor) params.set('cursor', cursor);
  if (history.length > 0) params.set('h', history.join(','));
  const qs = params.toString();
  return qs ? `/admin/pessoas/irmaos?${qs}` : '/admin/pessoas/irmaos';
}

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
    cursor?: string;
    h?: string;
  }>;
}) {
  const session = await requirePagePermission('member:read');
  const filters = await searchParams;
  const searchFilters = {
    nome: filters.nome,
    grau: filters.grau,
    situacao: filters.situacao,
    cidade: filters.cidade,
    cim: filters.cim,
    cargo: filters.cargo,
  };
  const cursorHistory = parseCursorHistory(filters.h);

  const filtersQuery = new URLSearchParams(
    Object.entries(searchFilters).filter((entry): entry is [string, string] => Boolean(entry[1])),
  ).toString();

  const container = createServerContainer();
  const [page, users, roles] = await Promise.all([
    container.useCases.searchMembers.execute(
      session.authContext,
      {
        nome: filters.nome || undefined,
        grau: filters.grau || undefined,
        situacao: filters.situacao || undefined,
        cidade: filters.cidade || undefined,
        cim: filters.cim || undefined,
        cargo: (filters.cargo || undefined) as BoardPositionKey | undefined,
      },
      { cursor: filters.cursor || undefined, limit: PAGE_SIZE },
    ),
    hasPermission(session.authContext, 'user:read')
      ? container.useCases.listUsers.execute(session.authContext)
      : Promise.resolve([]),
    hasPermission(session.authContext, 'role:read')
      ? container.useCases.listRoles.execute(session.authContext)
      : Promise.resolve([]),
  ]);

  const hasPrevious = Boolean(filters.cursor);
  const previousHref = hasPrevious
    ? (() => {
        const history = [...cursorHistory];
        const raw = history.pop();
        const cursor = raw && raw !== NO_CURSOR ? raw : undefined;
        return buildPageHref(searchFilters, cursor, history);
      })()
    : '';
  const hasNext = page.hasMore && Boolean(page.nextCursor);
  const nextHref = hasNext
    ? buildPageHref(searchFilters, page.nextCursor ?? undefined, [
        ...cursorHistory,
        filters.cursor || NO_CURSOR,
      ])
    : '';
  const usersByMemberId = new Map(users.filter((u) => u.memberId).map((u) => [u.memberId, u]));
  const rolesById = new Map(roles.map((r) => [r.id, r]));

  const columns: DataTableColumn<Member>[] = [
    {
      key: 'nome',
      header: 'Nome',
      cell: (m) => (
        <Link
          href={`/admin/pessoas/irmaos/${m.id}`}
          className="flex items-center gap-2 hover:underline"
        >
          <MemberAvatar fotoUrl={m.fotoUrl} nome={m.nomeCompleto} className="h-8 w-8" />
          <p className="font-medium">{m.nomeCompleto}</p>
        </Link>
      ),
    },
    { key: 'cim', header: 'CIM', cell: (m) => m.cim ?? '—' },
    { key: 'grau', header: 'Grau', cell: (m) => MEMBER_DEGREE_LABELS[m.grau] },
    {
      key: 'situacao',
      header: 'Situação',
      cell: (m) => (
        <Badge variant={SITUATION_VARIANT[m.situacao]}>
          {MEMBER_SITUATION_STATUS_LABELS[m.situacao]}
        </Badge>
      ),
    },
    {
      key: 'acesso',
      header: 'Acesso',
      cell: (m) => {
        const user = usersByMemberId.get(m.id);
        if (!user) return <span className="text-muted text-xs">Sem acesso</span>;
        return (
          <Badge variant={USER_STATUS_VARIANT[user.statusConta]}>
            {USER_STATUS_LABEL[user.statusConta]}
          </Badge>
        );
      },
    },
    {
      key: 'papel',
      header: 'Papel',
      cell: (m) => {
        const user = usersByMemberId.get(m.id);
        if (!user) return <span className="text-muted text-xs">—</span>;
        return rolesById.get(user.roleId)?.nome ?? '—';
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Cadastro de Irmãos</h1>
          <p className="text-muted">{page.items.length} Irmãos nesta página</p>
        </div>
        <div className="flex gap-2">
          {/* <a>, não <Link> — a rota interceptada @drawer/(.)[memberId] captura
              qualquer navegação client-side pra um segmento do mesmo nível
              (mesmo sendo uma pasta estática como "relatorio"/"importar"/"novo"),
              então um <Link> aqui abriria o drawer de edição em vez da página. */}
          <Button asChild variant="outline">
            <a href="/admin/pessoas/situacao-migracao">Migrar Situação Maçônica</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/admin/pessoas/irmaos/relatorio?${filtersQuery}`}>Gerar relatório</a>
          </Button>
          <Button asChild variant="outline">
            <a href={`/admin/pessoas/irmaos/importar`}>Importar planilha</a>
          </Button>
          <Button asChild>
            <a href={`/admin/pessoas/irmaos/novo`}>Novo Irmão</a>
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
          {MEMBER_SITUATION_STATUSES.map((situacao) => (
            <option key={situacao} value={situacao}>
              {MEMBER_SITUATION_STATUS_LABELS[situacao]}
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
            <Link href="/admin/pessoas/irmaos">Limpar</Link>
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
                <a href={`/admin/pessoas/irmaos/novo`}>Novo Irmão</a>
              </Button>
            }
          />
        }
      />

      <Pagination
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        previousHref={previousHref}
        nextHref={nextHref}
      />
    </div>
  );
}
