import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions/v2';
import type { Event } from '@vl6/domain';
import { TERMINAL_MEMBER_SITUATIONS } from '@vl6/shared';
import { FirestoreEventRepository, FirestoreMemberRepository, getAdminFirestore } from '@vl6/infra';

/**
 * Roda diariamente e cria um `Event` do tipo `aniversario` para cada Irmão
 * ativo cujo `dataNascimento` cai no dia corrente — docs/architecture/06
 * §6.4 ("gerados automaticamente ... não cadastrados manualmente").
 *
 * Sem `listAll` em `ITenantRepository` (deliberado — ver comentário na
 * interface: nenhum método de domínio enumera tenants sem escopo), então a
 * varredura de tenants acontece direto no Firestore aqui, na camada de
 * infra/functions, não através do domínio.
 *
 * Usa um id determinístico (`aniversario-{memberId}-{ano}`) para nunca
 * duplicar o evento em reexecuções do mesmo dia.
 */
export const birthdayReminder = onSchedule(
  { schedule: '0 6 * * *', timeZone: 'America/Sao_Paulo' },
  async () => {
    const db = getAdminFirestore();
    const eventRepository = new FirestoreEventRepository(db);
    const memberRepository = new FirestoreMemberRepository(db);

    const today = new Date();
    const month = today.getMonth();
    const day = today.getDate();
    const year = today.getFullYear();

    const tenantsSnap = await db.collection('tenants').get();

    for (const tenantDoc of tenantsSnap.docs) {
      const tenantId = tenantDoc.id;
      const { items: members } = await memberRepository.search({ tenantId }, { limit: 1000 });

      const aniversariantes = members.filter(
        (member) =>
          member.dataNascimento !== null &&
          !TERMINAL_MEMBER_SITUATIONS.includes(member.situacao) &&
          member.dataNascimento.getMonth() === month &&
          member.dataNascimento.getDate() === day,
      );

      for (const member of aniversariantes) {
        const eventId = `aniversario-${member.id}-${year}`;
        const existing = await eventRepository.findById(eventId);
        if (existing) continue;

        const nome = member.nomeMaconico ?? member.nomeCompleto;
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
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          updatedBy: 'system',
          deletedAt: null,
          status: 'active',
          ativo: true,
        };
        await eventRepository.create(event);
        logger.info(`Evento de aniversário criado: ${eventId}`);
      }
    }
  },
);
