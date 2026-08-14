import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { FileAssetForm } from '@/modules/document-management/components/file-asset-form';

export default async function NewFileAssetPage() {
  const session = await requirePagePermission('file:create');

  const container = createServerContainer();
  const categories = await container.useCases.listFileCategories.execute(session.authContext);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Arquivo</h1>
      <FileAssetForm categories={categories} />
    </div>
  );
}
