import { requirePagePermission } from '@/lib/auth/require-permission';
import { loadDuplicateMembersAction } from '@/modules/membership/actions/duplicate-member-actions';
import { DuplicateMemberManager } from '@/modules/membership/components/duplicate-member-manager';

/**
 * Revisão de Irmãos com cadastro duplicado (mesmo nome, normalizado) —
 * surge principalmente de reimportações da nominata histórica com pequenas
 * variações de grafia. O Administrador escolhe qual cadastro manter; o
 * resto é mesclado nele (histórico preservado) e arquivado.
 */
export default async function DuplicateMembersPage() {
  await requirePagePermission('member:manage');
  const groups = await loadDuplicateMembersAction();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Irmãos duplicados</h1>
        <p className="text-muted max-w-lg text-sm">
          Cadastros com o mesmo nome (ignorando acento/maiúscula) — comum depois de uma reimportação
          da nominata histórica com grafia ligeiramente diferente. Escolha qual cadastro manter; o
          resto é mesclado nele, sem perder histórico.
        </p>
      </div>
      <DuplicateMemberManager initialGroups={groups} />
    </div>
  );
}
