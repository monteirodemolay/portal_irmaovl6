import Link from 'next/link';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ResetPanel } from '../reset-panel';
export default async function CriptaMaintenancePage() {
  await requirePagePermission('tenant:manage');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link href="/admin/cripta" className="text-accent underline">
        ← Administração da Cripta
      </Link>
      <h1 className="font-display text-3xl font-semibold">Manutenção da Cripta</h1>
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
        Ferramentas restritas de ensaio. Zerar tudo apaga dados reais; confirme o alcance e as
        consequências no formulário. Esta operação não faz parte do ciclo anual.
      </p>
      <div className="flex flex-wrap gap-4">
        <Link href="/admin/cripta/demonstracao" className="underline">
          Demonstração
        </Link>
        <Link href="/admin/cripta/laboratorio" className="underline">
          Laboratório
        </Link>
      </div>
      <ResetPanel />
    </div>
  );
}
