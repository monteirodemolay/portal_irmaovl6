import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { MemberTitle } from '../entities/member-title.entity';
import type { IMemberTitleRepository } from '../repositories/member-title.repository';

export interface GrantMestreInstaladoTitleDeps {
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface GrantMestreInstaladoTitleParams {
  tenantId: string;
  memberId: string;
  /** Data em que o Irmão deixou de ser Venerável Mestre — o título é concedido no dia seguinte. */
  dataFimCargo: Date;
  uid: string;
  fundamento: string;
}

/**
 * Convenção institucional confirmada pelo Administrador: todo Irmão que
 * exerceu o cargo de Venerável Mestre vira Mestre Instalado automaticamente
 * — a condição é concedida no dia seguinte ao fim da sua gestão no cargo,
 * sem precisar de lançamento manual. Chamado nos 3 pontos onde uma posição
 * de Venerável Mestre é encerrada (`AssignBoardPositionUseCase`,
 * `RegisterMemberSituationUseCase`, `ImportHistoricalBoardTermsUseCase`) e
 * pelo backfill (`BackfillMestreInstaladoTitlesUseCase`, pra quem já tinha
 * deixado o cargo antes dessa regra existir). Idempotente: um Irmão nunca
 * acumula dois registros de Mestre Instalado, mesmo tendo exercido o cargo
 * mais de uma vez ou em gestões diferentes.
 */
export async function grantMestreInstaladoTitleIfNeeded(
  deps: GrantMestreInstaladoTitleDeps,
  params: GrantMestreInstaladoTitleParams,
): Promise<void> {
  const existing = await deps.memberTitleRepository.listByMemberId(
    params.tenantId,
    params.memberId,
  );
  if (existing.some((title) => title.titulo === 'mestre_instalado')) return;

  const now = deps.clock.now();
  const dataConcessao = new Date(params.dataFimCargo);
  dataConcessao.setDate(dataConcessao.getDate() + 1);

  const title: MemberTitle = {
    id: deps.idGenerator.next(),
    tenantId: params.tenantId,
    memberId: params.memberId,
    titulo: 'mestre_instalado',
    tituloOutro: null,
    dataConcessao,
    fundamento: params.fundamento,
    createdAt: now,
    updatedAt: now,
    createdBy: params.uid,
    updatedBy: params.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
  await deps.memberTitleRepository.create(title);
}
