import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../repositories/member.repository';
import type { IMemberSituationRecordRepository } from '../repositories/member-situation-record.repository';

export interface BackfillDataFalecimentoDeps {
  memberRepository: IMemberRepository;
  situationRecordRepository: IMemberSituationRecordRepository;
  clock: IClock;
}

export interface BackfillDataFalecimentoResult {
  totalFalecidosSemData: number;
  corrigidos: Array<{ memberId: string; nomeCompleto: string; dataFalecimento: Date }>;
  semRegistroVigente: Array<{ memberId: string; nomeCompleto: string }>;
}

/**
 * Corrige `Member.dataFalecimento` de quem está `situacao: 'falecido'` mas
 * ficou com o campo em branco — registros herdados de antes dessa regra
 * de espelhamento existir (a nominata histórica sempre cria o Irmão como
 * "Ativo", e alguém precisa ter marcado o falecimento por fora do fluxo
 * padrão pra esse buraco existir). Efeito visível: `LodgeTenureBadge`
 * ("Há X anos na Loja"/"Foi Maçom por X anos") nunca parava de contar pra
 * esses Irmãos, porque a data de corte estava vazia.
 *
 * Busca o registro vigente de `MemberSituationRecord` (situacao
 * 'falecido') de cada um e copia `dataInicio` pra `Member.dataFalecimento`
 * — mesma fonte da verdade usada por `RegisterMemberSituationUseCase` e
 * `EditMemberSituationRecordUseCase`. Quem não tem esse registro (situação
 * gravada direto no cadastro, sem histórico) aparece em
 * `semRegistroVigente` pro Administrador completar manualmente. Seguro
 * rodar de novo: só mexe em quem ainda está com `dataFalecimento: null`.
 */
export class BackfillDataFalecimentoUseCase {
  constructor(private readonly deps: BackfillDataFalecimentoDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BackfillDataFalecimentoResult>> {
    requirePermission(ctx, 'member:manage');

    const falecidosSemData: Array<{ id: string; nomeCompleto: string }> = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.deps.memberRepository.search(
        { tenantId: ctx.tenantId, situacao: 'falecido' },
        { limit: 100, cursor },
      );
      for (const member of page.items) {
        if (member.situacao === 'falecido' && !member.dataFalecimento) {
          falecidosSemData.push({ id: member.id, nomeCompleto: member.nomeCompleto });
        }
      }
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    const now = this.deps.clock.now();
    const corrigidos: BackfillDataFalecimentoResult['corrigidos'] = [];
    const semRegistroVigente: BackfillDataFalecimentoResult['semRegistroVigente'] = [];

    for (const { id, nomeCompleto } of falecidosSemData) {
      const vigente = await this.deps.situationRecordRepository.findVigenteByMemberId(id);
      if (!vigente || vigente.situacao !== 'falecido') {
        semRegistroVigente.push({ memberId: id, nomeCompleto });
        continue;
      }

      const member = await this.deps.memberRepository.findById(id);
      if (!member) continue;

      await this.deps.memberRepository.update({
        ...member,
        dataFalecimento: vigente.dataInicio,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
      corrigidos.push({ memberId: id, nomeCompleto, dataFalecimento: vigente.dataInicio });
    }

    return ok({
      totalFalecidosSemData: falecidosSemData.length,
      corrigidos,
      semRegistroVigente,
    });
  }
}
