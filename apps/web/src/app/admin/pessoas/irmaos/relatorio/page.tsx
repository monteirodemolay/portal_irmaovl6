import { requirePagePermission } from '@/lib/auth/require-permission';
import { MemberReportWizard } from '@/modules/membership/components/member-report-wizard';

export default async function MemberReportPage({
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
  await requirePagePermission('member:read');
  const filters = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="print:hidden">
        <h1 className="font-display text-2xl font-semibold">Relatório de Irmãos</h1>
        <p className="text-muted">
          Ajuste os filtros e as colunas, veja a prévia e baixe em PDF, Word, Excel ou CSV — ou
          imprima direto da tela.
        </p>
      </div>
      <MemberReportWizard initialFilters={filters} />
    </div>
  );
}
