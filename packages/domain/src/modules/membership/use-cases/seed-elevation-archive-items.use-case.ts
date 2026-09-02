import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { CreateElevationArchiveItemUseCase } from '../../archive/use-cases/create-elevation-archive-item.use-case';
import type { IMemberRepository } from '../repositories/member.repository';

export interface SeedElevationArchiveItemsDeps {
  memberRepository: IMemberRepository;
  createElevationArchiveItem: CreateElevationArchiveItemUseCase;
}

export interface SeedElevationArchiveItemsReportRow {
  memberId: string;
  nomeCompleto: string;
  archiveItemId: string;
  eventCreated: boolean;
}

export interface SeedElevationArchiveItemsReport {
  processados: SeedElevationArchiveItemsReportRow[];
  pulados: number;
  erros: { memberId: string; nomeCompleto: string; mensagem: string }[];
}

/**
 * Backfill retroativo — mesmo papel de `SeedInitiationArchiveItemsUseCase`,
 * agora para o item de elevação (2º grau). Cria o `ArchiveItem` pra cada
 * Irmão do tenant que já tem `dataElevacao` preenchida e ainda não tem o
 * item correspondente. Idempotente e isolado por Irmão (mesmas garantias
 * de `SeedInitiationArchiveItemsUseCase`).
 */
export class SeedElevationArchiveItemsUseCase {
  constructor(private readonly deps: SeedElevationArchiveItemsDeps) {}

  async execute(ctx: AuthContext): Promise<SeedElevationArchiveItemsReport> {
    requirePermission(ctx, 'member:manage');

    const { items: members } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 5000 },
    );

    const report: SeedElevationArchiveItemsReport = {
      processados: [],
      pulados: 0,
      erros: [],
    };

    for (const member of members) {
      if (!member.dataElevacao) {
        report.pulados++;
        continue;
      }

      try {
        const result = await this.deps.createElevationArchiveItem.execute(ctx, {
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          dataElevacao: member.dataElevacao,
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
