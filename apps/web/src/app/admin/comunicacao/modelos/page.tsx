import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import type { ArtTemplate } from '@vl6/domain';
import { ART_TEMPLATE_TYPE_LABELS } from '@vl6/shared';
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';

const BASE_PATH = '/admin/comunicacao/modelos';

export default async function ArtTemplateLibraryPage() {
  const session = await requirePagePermission('communication:manage');
  const container = createServerContainer();
  const templates = await container.useCases.listArtTemplates.execute(session.authContext);

  const columns: DataTableColumn<ArtTemplate>[] = [
    {
      key: 'preview',
      header: '',
      cell: (t) => (
        <img
          src={t.backgroundUrl}
          alt=""
          className="border-border h-14 w-11 rounded border object-cover"
        />
      ),
    },
    {
      key: 'nome',
      header: 'Modelo',
      cell: (t) => (
        <Link href={`${BASE_PATH}/${t.id}`} className="font-medium hover:underline">
          {t.name}
        </Link>
      ),
    },
    { key: 'tipo', header: 'Tipo', cell: (t) => ART_TEMPLATE_TYPE_LABELS[t.type] },
    { key: 'campos', header: 'Campos', cell: (t) => t.fields.length },
    { key: 'versao', header: 'Versão', cell: (t) => `v${t.version}` },
    {
      key: 'status',
      header: 'Status',
      cell: (t) => (
        <Badge variant={t.active ? 'success' : 'outline'}>{t.active ? 'ativo' : 'inativo'}</Badge>
      ),
    },
    {
      key: 'acoes',
      header: '',
      cell: (t) => (
        <Button asChild variant="outline" size="sm">
          <Link href={`${BASE_PATH}/${t.id}`}>Editar</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Modelos de arte</h1>
          <p className="text-muted text-sm">
            A identidade visual (brasões, moldura, mensagem institucional) fica protegida — só os
            campos que você posicionar aqui ficam disponíveis pra preencher depois.
          </p>
        </div>
        <Button asChild>
          <Link href={`${BASE_PATH}/novo`}>Novo modelo</Link>
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={templates}
        getRowId={(t) => t.id}
        emptyState={<EmptyState title="Nenhum modelo cadastrado ainda" />}
      />
    </div>
  );
}
