import { Button } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ImportMembersForm } from '@/modules/membership/components/import-members-form';

export default async function ImportMembersPage() {
  await requirePagePermission('member:create');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Importar Irmãos</h1>
          <p className="text-muted">Cadastre vários Irmãos de uma vez a partir de uma planilha.</p>
        </div>
        <Button asChild variant="outline">
          <a href="/api/v1/admin/members/export?format=xlsx">Baixar modelo</a>
        </Button>
      </div>
      <ImportMembersForm />
    </div>
  );
}
