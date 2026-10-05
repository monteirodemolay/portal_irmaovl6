import { criptaRoute } from '@/modules/cripta/lib/cripta-route';
import { createServerContainer } from '@vl6/infra';
import { NextResponse } from 'next/server';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';

export const runtime = 'nodejs';

/** Downloadable, read-only list of Irmãos Ativos com conta vinculada (excluído o Venerável) — a
 * mesma elegibilidade já usada no sorteio de Guardiões e na Comissão. Pensada para ser levada,
 * como arquivo, ao ambiente offline da ferramenta de Renovação (scripts/cripta/abertura-offline),
 * só para reduzir erro de digitação ao nomear novos Guardiões ali — nunca chega sozinha a abrir
 * ou comprometer nada: é só nome e id, nada secreto. */
export const GET = criptaRoute(async function GET() {
  const session = await requirePagePermission('tenant:manage');
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const [master, { items: members }] = await Promise.all([
    currentCriptaMaster(tenantId),
    container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 500 }),
  ]);
  const eligible = members
    .filter((member) => member.userId && member.id !== master?.member.id)
    .map((member) => ({ id: member.id, nome: member.nomeCompleto }));
  return NextResponse.json(
    {
      format: 'vl6-cripta-eligible-members-v1',
      generatedAt: new Date().toISOString(),
      members: eligible,
    },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
});
