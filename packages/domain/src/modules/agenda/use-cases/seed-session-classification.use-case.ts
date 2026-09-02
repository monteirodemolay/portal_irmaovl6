import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { classifyLegacySession } from '../lib/classify-legacy-session';
import type { IEventRepository } from '../repositories/event.repository';

export interface SeedSessionClassificationDeps {
  eventRepository: IEventRepository;
  clock: IClock;
}

export interface SeedSessionClassificationReportRow {
  eventId: string;
  titulo: string;
  sessionType: string;
  sessionNature: string;
  reviewRequired: boolean;
}

export interface SeedSessionClassificationReport {
  analisados: number;
  migrados: SeedSessionClassificationReportRow[];
  pendentesRevisao: number;
  pulados: number;
}

/**
 * Backfill retroativo — migra toda Sessão (`Event.tipo === 'sessao'`) já
 * cadastrada com a classificação antiga (`titulo` livre + `grau`
 * conflado) pra classificação estruturada (Tipo/Natureza/Grau dos
 * trabalhos/Acesso), pedido do Administrador. Idempotente: só processa
 * Sessões ainda sem `sessionType` — rodar de novo não reclassifica quem já
 * foi migrado ou cadastrado direto pela estrutura nova.
 *
 * NUNCA apaga ou sobrescreve o `titulo` original (Regra de Preservação —
 * item 11 do pedido: classificação estruturada e título histórico/
 * editorial são dados diferentes) — só grava a classificação nos campos
 * novos e preserva o texto original em `legacySessionType` para auditoria.
 * `classifyLegacySession` nunca adivinha: quando o texto não dá segurança
 * suficiente, marca `classificationReviewRequired: true` em vez de inventar
 * Natureza/Grau/Acesso (item 9).
 */
export class SeedSessionClassificationUseCase {
  constructor(private readonly deps: SeedSessionClassificationDeps) {}

  async execute(ctx: AuthContext): Promise<SeedSessionClassificationReport> {
    requirePermission(ctx, 'event:manage');

    const { items: events } = await this.deps.eventRepository.listAll(ctx.tenantId, {
      limit: 5000,
    });

    const report: SeedSessionClassificationReport = {
      analisados: 0,
      migrados: [],
      pendentesRevisao: 0,
      pulados: 0,
    };

    const now = this.deps.clock.now();

    for (const event of events) {
      if (event.tipo !== 'sessao') continue;
      report.analisados++;

      if (event.sessionType) {
        report.pulados++;
        continue;
      }

      const classification = classifyLegacySession(event.titulo, event.grau);
      await this.deps.eventRepository.update({
        ...event,
        sessionType: classification.sessionType,
        sessionNature: classification.sessionNature,
        degreeWork: classification.degreeWork,
        access: event.access ?? 'privativa_macons',
        isJointSession: event.isJointSession ?? false,
        participatingLodges: event.participatingLodges ?? [],
        legacySessionType: `titulo="${event.titulo}" grau=${event.grau ?? 'null'}`,
        classificationReviewRequired: classification.reviewRequired,
        updatedAt: now,
        updatedBy: ctx.uid,
      });

      if (classification.reviewRequired) report.pendentesRevisao++;
      report.migrados.push({
        eventId: event.id,
        titulo: event.titulo,
        sessionType: classification.sessionType,
        sessionNature: classification.sessionNature,
        reviewRequired: classification.reviewRequired,
      });
    }

    return report;
  }
}
