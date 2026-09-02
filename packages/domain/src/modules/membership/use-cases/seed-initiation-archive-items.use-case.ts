import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { CreateInitiationArchiveItemUseCase } from '../../archive/use-cases/create-initiation-archive-item.use-case';
import type { IMemberRepository } from '../repositories/member.repository';

export interface SeedInitiationArchiveItemsDeps {
  memberRepository: IMemberRepository;
  createInitiationArchiveItem: CreateInitiationArchiveItemUseCase;
}

export interface SeedInitiationArchiveItemsReportRow {
  memberId: string;
  nomeCompleto: string;
  archiveItemId: string;
  eventCreated: boolean;
}

export interface SeedInitiationArchiveItemsReport {
  processados: SeedInitiationArchiveItemsReportRow[];
  pulados: number;
  erros: { memberId: string; nomeCompleto: string; mensagem: string }[];
}

/**
 * Backfill retroativo (executado manualmente por um Admin, mesmo padrão de
 * `SeedMemberSituationHistoryUseCase`) — cria o `ArchiveItem` de iniciação
 * pra cada Irmão do tenant que já tem `dataIniciacao` preenchida e ainda
 * não tem o item correspondente. Idempotente: pode ser executado quantas
 * vezes forem necessárias, só cobre quem ficou de fora da vez anterior
 * (`CreateInitiationArchiveItemUseCase` já checa `origemIniciacaoMemberId`
 * antes de criar qualquer coisa).
 *
 * Nunca falha a execução inteira por causa de um Irmão problemático — cada
 * Irmão é processado isoladamente e uma falha individual (ex.: Gestão
 * ausente causando algum erro no meio do caminho) entra no relatório em
 * `erros`, sem interromper os demais. Nunca edita nem apaga nada já
 * existente (Member, Event ou ArchiveItem) — só cria o que falta.
 */
export class SeedInitiationArchiveItemsUseCase {
  constructor(private readonly deps: SeedInitiationArchiveItemsDeps) {}

  async execute(ctx: AuthContext): Promise<SeedInitiationArchiveItemsReport> {
    requirePermission(ctx, 'member:manage');

    const { items: members } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 5000 },
    );

    const report: SeedInitiationArchiveItemsReport = {
      processados: [],
      pulados: 0,
      erros: [],
    };

    for (const member of members) {
      if (!member.dataIniciacao) {
        report.pulados++;
        continue;
      }

      try {
        const result = await this.deps.createInitiationArchiveItem.execute(ctx, {
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          dataIniciacao: member.dataIniciacao,
        });

        if (!result.created) {
          report.pulados++;
          continue;
        }

        report.processados.push({
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          archiveItemId: result.archiveItem.id,
          eventCreated: result.eventCreated,
        });
      } catch (error) {
        report.erros.push({
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          mensagem: error instanceof Error ? error.message : 'Erro desconhecido.',
        });
      }
    }

    return report;
  }
}
