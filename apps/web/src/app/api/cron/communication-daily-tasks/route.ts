import { NextResponse, type NextRequest } from 'next/server';
import { logger, TERMINAL_MEMBER_SITUATION_STATUSES } from '@vl6/shared';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { requireCronSecret } from '@/lib/api/require-cron-secret';

const ROUTE = 'GET /api/cron/communication-daily-tasks';

/**
 * Job diário único da Central de Comunicação (Vercel Cron, plano Hobby —
 * só roda 1x/dia, mesmo padrão de `/api/cron/birthday-reminder` e
 * `/api/cron/notification-daily-tasks`) — gera o rascunho de aniversário do
 * dia pra cada Irmão que autorizou divulgação externa
 * (`Member.autorizaDivulgacaoExterna`), usando o primeiro modelo ativo do
 * tipo "Aniversário" encontrado no tenant. Sem modelo cadastrado, o tenant
 * é pulado (não é uma falha — só não há como gerar arte ainda).
 * `CreatePublicationFromBirthdayUseCase` já é idempotente por Irmão/dia,
 * então reexecuções não duplicam.
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const db = getAdminFirestore();
  const container = createServerContainer();
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();

  const tenantsSnap = await db.collection('tenants').get();
  let geradas = 0;
  let falhas = 0;

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const systemCtx = {
      uid: 'system',
      tenantId,
      roleId: 'system',
      permissions: ['communication:manage' as const],
    };

    const templates = await container.repositories.artTemplate.listActiveByType(
      tenantId,
      'birthday',
    );
    const template = templates[0];
    if (!template) continue;

    const { items: members } = await container.repositories.member.search(
      { tenantId },
      { limit: 1000 },
    );
    const aniversariantes = members.filter(
      (member) =>
        member.dataNascimento !== null &&
        member.autorizaDivulgacaoExterna &&
        !TERMINAL_MEMBER_SITUATION_STATUSES.includes(member.situacao) &&
        member.dataNascimento.getMonth() === month &&
        member.dataNascimento.getDate() === day,
    );

    for (const member of aniversariantes) {
      const result = await container.useCases.createPublicationFromBirthday.execute(
        systemCtx,
        member.id,
        template.id,
      );
      if (result.ok) geradas += 1;
      else falhas += 1;
    }
  }

  logger.info('Job diário da Central de Comunicação concluído', { route: ROUTE, geradas, falhas });
  return NextResponse.json({ geradas, falhas });
});
