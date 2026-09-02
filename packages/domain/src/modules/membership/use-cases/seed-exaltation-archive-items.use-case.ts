import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { CreateExaltationArchiveItemUseCase } from '../../archive/use-cases/create-exaltation-archive-item.use-case';
import type { IMemberRepository } from '../repositories/member.repository';

export interface SeedExaltationArchiveItemsDeps {
  memberRepository: IMemberRepository;
  createExaltationArchiveItem: CreateExaltationArchiveItemUseCase;
}

export interface SeedExaltationArchiveItemsReportRow {
  memberId: string;
  nomeCompleto: string;
  archiveItemId: string;
  eventCreated: boolean;
}

export interface SeedExaltationArchiveItemsReport {
  processados: SeedExaltationArchiveItemsReportRow[];
  pulados: number;
  erros: { memberId: string; nomeCompleto: string; mensagem: string }[];
}

/**
 * Backfill retroativo — mesmo papel de `SeedInitiationArchiveItemsUseCase`/
 * `SeedElevationArchiveItemsUseCase`, agora para o item de exaltação (3º
 * grau). Cria o `ArchiveItem` pra cada Irmão do tenant que já tem
 * `dataExaltacao` preenchida e ainda não tem o item correspondente.
 * Idempotente e isolado por Irmão.
 */
export class SeedExaltationArchiveItemsUseCase {
  constructor(private readonly deps: SeedExaltationArchiveItemsDeps) {}

  async execute(ctx: AuthContext): Promise<SeedExaltationArchiveItemsReport> {
    requirePermission(ctx, 'member:manage');

    const { items: members } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 5000 },
    );

    const report: SeedExaltationArchiveItemsReport = {
      processados: [],
      pulados: 0,
      erros: [],
    };

    for (const member of members) {
      if (!member.dataExaltacao) {
        report.pulados++;
        continue;
      }

      try {
        const result = await this.deps.createExaltationArchiveItem.execute(ctx, {
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          dataExaltacao: member.dataExaltacao,
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
