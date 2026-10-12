import { hasPermission } from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { HonorsAdminList } from '@/modules/honors/components/honors-admin-list';
import type { HonorRow } from '@/modules/honors/lib/honor-admin-view';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Honrarias · Administração VL6' };

export default async function HonorsAdminPage() {
  const session = await requirePagePermission('honor:read');
  const container = createServerContainer();
  const honors = await container.useCases.listHonorGallery.execute(session.authContext);

  const memberIds = [...new Set(honors.map((h) => h.memberId).filter((id): id is string => !!id))];
  const members = await Promise.all(
    memberIds.map((id) => container.repositories.member.findById(id)),
  );
  const names = new Map(members.filter((m) => m !== null).map((m) => [m!.id, m!.nomeCompleto]));

  const rows: HonorRow[] = honors.map((h) => ({
    id: h.id,
    nomeOficial: h.nomeOficial,
    tipo: h.tipo,
    homenageado: h.memberId
      ? (names.get(h.memberId) ?? 'Irmão não localizado')
      : (h.homenageadoNome ?? 'Homenageado não informado'),
    memberId: h.memberId,
    instituicao: h.instituicaoConcedente,
    data: h.data ? new Date(h.data).toISOString() : null,
    numeroAto: h.numeroAto,
    temDiploma: Boolean(h.diplomaFileId),
    temFoto: Boolean(h.fotoEntregaFileId),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Honrarias e condecorações</h1>
        <p className="text-muted mt-1 max-w-2xl text-sm">
          É exatamente o que a Galeria de Honra mostra aos Irmãos. Para lançar ou corrigir, abra a
          ficha do Irmão homenageado.
        </p>
      </div>
      <HonorsAdminList rows={rows} canManage={hasPermission(session.authContext, 'honor:manage')} />
    </div>
  );
}
