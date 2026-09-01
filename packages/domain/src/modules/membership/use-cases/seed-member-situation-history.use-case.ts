import type { MemberSituationStatus } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberSituationRecordRepository } from '../repositories/member-situation-record.repository';
import type { MemberSituationRecord } from '../entities/member-situation-record.entity';

export interface SeedMemberSituationHistoryDeps {
  memberRepository: IMemberRepository;
  situationRecordRepository: IMemberSituationRecordRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface SeedMemberSituationHistoryReportRow {
  memberId: string;
  nomeCompleto: string;
  situacaoAntiga: string;
  situacaoNova: MemberSituationStatus;
  motivoNovo: string;
  precisaRevisao: boolean;
  motivoRevisao: string | null;
}

/**
 * Mapeamento best-effort do enum plano legado (`regular`/`irregular`/
 * `remido`/`inativo`/`falecido`/`transferido`, usado antes deste módulo)
 * pro registro inicial da nova Situação Maçônica. `transferido` e
 * `falecido` têm mapeamento direto e inequívoco; os demais são
 * genuinamente ambíguos (o enum antigo misturava situação institucional
 * com status financeiro) — todos esses entram marcados
 * `precisaRevisao: true` no relatório, nunca silenciosamente.
 */
const LEGACY_MAPPING: Record<
  string,
  {
    situacao: MemberSituationStatus;
    motivo: string;
    precisaRevisao: boolean;
    motivoRevisao: string | null;
  }
> = {
  regular: { situacao: 'ativo', motivo: 'outro', precisaRevisao: false, motivoRevisao: null },
  transferido: {
    situacao: 'desligado',
    motivo: 'transferencia_outra_loja',
    precisaRevisao: false,
    motivoRevisao: null,
  },
  falecido: {
    situacao: 'falecido',
    motivo: 'passou_ao_oriente_eterno',
    precisaRevisao: true,
    motivoRevisao: 'Data do falecimento não estava registrada no cadastro anterior.',
  },
  irregular: {
    situacao: 'suspenso',
    motivo: 'outro',
    precisaRevisao: true,
    motivoRevisao: '"Irregular" é ambíguo na taxonomia anterior — confirme a modalidade correta.',
  },
  remido: {
    situacao: 'ativo',
    motivo: 'outro',
    precisaRevisao: true,
    motivoRevisao:
      '"Remido" normalmente indica isenção de mensalidade, não afeta a situação maçônica — confirme se está correto.',
  },
  inativo: {
    situacao: 'licenciado',
    motivo: 'outro',
    precisaRevisao: true,
    motivoRevisao:
      '"Inativo" é ambíguo na taxonomia anterior — confirme se é licença ou desligamento.',
  },
};

/**
 * Migração assistida (executada manualmente por um Admin, mesmo padrão de
 * `MigrateGalleryAlbumUseCase`) — cria o primeiro `MemberSituationRecord`
 * pra cada Irmão que ainda não tem nenhum, a partir do `situacao` legado.
 * Idempotente: um Irmão com pelo menos um registro no histórico é pulado.
 * Nunca inventa data — sem `dataIniciacao` conhecida, usa a data de
 * cadastro do Irmão no Portal como estimativa e marca `dataInicioEstimada:
 * true`, sempre reportado como pendente de revisão.
 */
export class SeedMemberSituationHistoryUseCase {
  constructor(private readonly deps: SeedMemberSituationHistoryDeps) {}

  async execute(ctx: AuthContext): Promise<SeedMemberSituationHistoryReportRow[]> {
    requirePermission(ctx, 'member:manage');

    const { items: members } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 5000 },
    );

    const report: SeedMemberSituationHistoryReportRow[] = [];
    const now = this.deps.clock.now();

    for (const member of members) {
      const existentes = await this.deps.situationRecordRepository.listByMemberId(member.id);
      if (existentes.length > 0) continue;

      const situacaoAntiga = String(member.situacao);
      const mapping = LEGACY_MAPPING[situacaoAntiga] ?? {
        situacao: 'ativo' as MemberSituationStatus,
        motivo: 'outro',
        precisaRevisao: true,
        motivoRevisao: `Situação legada "${situacaoAntiga}" não reconhecida — revisar manualmente.`,
      };

      const dataInicio = member.dataIniciacao ?? member.createdAt;
      const dataInicioEstimada = !member.dataIniciacao;

      const record: MemberSituationRecord = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        memberId: member.id,
        situacao: mapping.situacao,
        motivo: mapping.motivo,
        motivoOutroDescricao:
          mapping.motivo === 'outro'
            ? `Migrado automaticamente do status legado "${situacaoAntiga}".`
            : null,
        dataInicio,
        dataFim: null,
        lojaId: member.lojaId,
        potencia: member.potencia,
        documentoNumero: null,
        documentoData: null,
        observacoes: 'Registro inicial gerado pela migração automática da Situação Maçônica.',
        anexos: [],
        vigente: true,
        dataInicioEstimada,
        justificativaEdicaoRetroativa: null,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.situationRecordRepository.create(record);

      if (mapping.situacao !== member.situacao) {
        await this.deps.memberRepository.update({
          ...member,
          situacao: mapping.situacao,
          updatedAt: now,
          updatedBy: ctx.uid,
        });
      }

      report.push({
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        situacaoAntiga,
        situacaoNova: mapping.situacao,
        motivoNovo: mapping.motivo,
        precisaRevisao: mapping.precisaRevisao || dataInicioEstimada,
        motivoRevisao:
          mapping.motivoRevisao ??
          (dataInicioEstimada ? 'Data de início não informada — usada a data de cadastro.' : null),
      });
    }

    return report;
  }
}
