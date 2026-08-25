import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { Publication } from '@vl6/domain';
import {
  BRAZIL_TIME_ZONE,
  PUBLICATION_STATUS_LABELS,
  PUBLICATION_OUTPUT_FORMAT_LABELS,
  type PublicationStatus,
} from '@vl6/shared';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { cn } from '@vl6/ui';

const BASE_PATH = '/admin/comunicacao';

const TABS = [
  { key: 'fila', label: 'Fila', statuses: ['draft', 'awaiting_approval'] as PublicationStatus[] },
  { key: 'prontas', label: 'Prontas', statuses: ['ready'] as PublicationStatus[] },
  { key: 'publicadas', label: 'Publicadas', statuses: ['published'] as PublicationStatus[] },
  { key: 'arquivadas', label: 'Arquivadas', statuses: ['archived'] as PublicationStatus[] },
] as const;

const STATUS_TONE: Record<PublicationStatus, 'default' | 'outline' | 'success' | 'warning'> = {
  draft: 'default',
  awaiting_approval: 'warning',
  ready: 'outline',
  published: 'success',
  archived: 'default',
};

const SOURCE_LABELS: Record<Publication['sourceType'], string> = {
  agenda_event: 'Sessão',
  member: 'Aniversário',
  manual: 'Campanha',
};

function formatDate(date: Date | null): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(new Date(date));
}

export default async function CommunicationCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; erro?: string }>;
}) {
  const session = await requirePagePermission('communication:manage');
  const { aba, erro } = await searchParams;
  const activeTab = TABS.find((t) => t.key === aba) ?? TABS[0];

  const container = createServerContainer();
  const publications = await container.useCases.listPublications.execute(
    session.authContext,
    activeTab.statuses,
  );

  const columns: DataTableColumn<Publication>[] = [
    {
      key: 'titulo',
      header: 'Publicação',
      cell: (pub) => (
        <div className="flex flex-col">
          <span className="text-muted text-xs">{SOURCE_LABELS[pub.sourceType]}</span>
          <Link href={`${BASE_PATH}/publicacoes/${pub.id}`} className="font-medium hover:underline">
            {pub.title}
          </Link>
        </div>
      ),
    },
    { key: 'data', header: 'Data', cell: (pub) => formatDate(pub.scheduledFor) },
    {
      key: 'formatos',
      header: 'Artes',
      cell: (pub) =>
        pub.assets.length > 0
          ? pub.assets.map((a) => PUBLICATION_OUTPUT_FORMAT_LABELS[a.format]).join(', ')
          : '—',
    },
    {
      key: 'status',
      header: 'Status',
      cell: (pub) => (
        <Badge variant={STATUS_TONE[pub.publicacaoStatus]}>
          {PUBLICATION_STATUS_LABELS[pub.publicacaoStatus]}
        </Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (pub) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`${BASE_PATH}/publicacoes/${pub.id}`}>Abrir</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Central de Comunicação</h1>
          <p className="text-muted text-sm">
            Planeje, gere, aprove e entregue as publicações oficiais da Loja em um único ambiente.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`${BASE_PATH}/modelos`}>Modelos</Link>
        </Button>
      </div>

      {erro && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {erro === 'sem-modelo-de-sessao'
            ? 'Nenhum modelo ativo do tipo "Sessão" encontrado. Cadastre um em Modelos antes de gerar artes de sessão.'
            : erro}
        </p>
      )}

      <div className="border-border flex gap-4 border-b text-sm">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === 'fila' ? BASE_PATH : `${BASE_PATH}?aba=${tab.key}`}
            className={cn(
              'border-b-2 pb-2',
              activeTab.key === tab.key
                ? 'border-accent font-semibold'
                : 'text-muted border-transparent',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={publications}
        getRowId={(pub) => pub.id}
        emptyState={<EmptyState title="Nenhuma publicação nesta aba" />}
      />
    </div>
  );
}
