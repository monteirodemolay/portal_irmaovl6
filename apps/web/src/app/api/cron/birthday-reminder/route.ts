import { NextResponse, type NextRequest } from 'next/server';
import type { Event } from '@vl6/domain';
import { logger, TERMINAL_MEMBER_SITUATION_STATUSES } from '@vl6/shared';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { withApiLogging } from '@/lib/api/with-api-logging';
import { requireCronSecret } from '@/lib/api/require-cron-secret';

const ROUTE = 'GET /api/cron/birthday-reminder';

/**
 * Cria um `Event` do tipo `aniversario` para cada Irmão ativo cujo
 * `dataNascimento` cai no dia corrente, em todos os tenants — docs/
 * architecture/06 §6.4 ("gerados automaticamente, não cadastrados
 * manualmente"). Substitui a Cloud Function `birthdayReminder` (sem plano
 * Blaze, não roda) — disparada por Vercel Cron, ver `vercel.json`.
 *
 * Sem `listAll` em `ITenantRepository` (deliberado — nenhum método de
 * domínio enumera tenants sem escopo), a varredura de tenants acontece
 * direto no Firestore aqui, fora do domínio. Id determinístico
 * (`aniversario-{memberId}-{ano}`) evita duplicar o evento em reexecuções.
 */
export const GET = withApiLogging(ROUTE, async (request: NextRequest) => {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const db = getAdminFirestore();
  const container = createServerContainer();
  const today = new Date();
  const month = today.getMonth();
  const day = today.getDate();
  const year = today.getFullYear();

  const tenantsSnap = await db.collection('tenants').get();
  let criados = 0;

  for (const tenantDoc of tenantsSnap.docs) {
    const tenantId = tenantDoc.id;
    const { items: members } = await container.repositories.member.search(
      { tenantId },
      { limit: 1000 },
    );

    const aniversariantes = members.filter(
      (member) =>
        member.dataNascimento !== null &&
        !TERMINAL_MEMBER_SITUATION_STATUSES.includes(member.situacao) &&
        member.dataNascimento.getMonth() === month &&
        member.dataNascimento.getDate() === day,
    );

    for (const member of aniversariantes) {
      const eventId = `aniversario-${member.id}-${year}`;
      const existing = await container.repositories.event.findById(eventId);
      if (existing) continue;

      const nome = member.nomeCompleto;
      const now = new Date();
      const event: Event = {
        id: eventId,
        tenantId,
        tipo: 'aniversario',
        titulo: `Aniversário de ${nome}`,
        descricao: null,
        local: '—',
        dataInicio: new Date(year, month, day, 0, 0, 0),
        dataFim: new Date(year, month, day, 23, 59, 59),
        exigeConfirmacaoPresenca: false,
        capacidadeMaxima: null,
        traje: null,
        chegadaSugerida: null,
        observacoes: null,
        arquivosRelacionados: [],
        boardTermId: null,
        nivelAcesso: 'irmaos',
        exibirNaLinhaDoTempo: false,
        grau: null,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await container.repositories.event.create(event);
      criados += 1;
    }
  }

  logger.info('Eventos de aniversário gerados', { route: ROUTE, criados });
  return NextResponse.json({ criados });
});
