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

/** Mesmo dia (data local, sem hora) — usado para não conceder duas vezes o título do mesmo encerramento de gestão. */
function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Convenção institucional confirmada pelo Administrador: todo Irmão que
 * exerceu o cargo de Venerável Mestre vira Mestre Instalado automaticamente
 * — a condição é concedida no dia seguinte ao fim da sua gestão no cargo,
 * sem precisar de lançamento manual. Chamado nos 3 pontos onde uma posição
 * de Venerável Mestre é encerrada (`AssignBoardPositionUseCase`,
 * `RegisterMemberSituationUseCase`, `ImportHistoricalBoardTermsUseCase`) e
 * pelo backfill (`BackfillMestreInstaladoTitlesUseCase`, pra quem já tinha
 * deixado o cargo antes dessa regra existir).
 *
 * Um Irmão PODE acumular vários registros de Mestre Instalado, um por
 * gestão em que exerceu o cargo de Venerável Mestre (correção de uma regra
 * anterior, que impedia acumular mais de um) — cada gestão concluída gera
 * seu próprio título, com sua própria data de concessão, e todos aparecem
 * na lista de Títulos e Condições Maçônicas do Irmão. Só é idempotente para
 * o MESMO encerramento de gestão (mesma `dataConcessao`), evitando
 * duplicar o registro se esta função for chamada mais de uma vez para o
 * mesmo evento (ex.: reprocessamento do backfill).
 */
/** @returns `true` se um novo título foi criado, `false` se já existia um para esta mesma gestão. */
export async function grantMestreInstaladoTitleIfNeeded(
  deps: GrantMestreInstaladoTitleDeps,
  params: GrantMestreInstaladoTitleParams,
): Promise<boolean> {
  const now = deps.clock.now();
  const dataConcessao = new Date(params.dataFimCargo);
  dataConcessao.setDate(dataConcessao.getDate() + 1);

  const existing = await deps.memberTitleRepository.listByMemberId(
    params.tenantId,
    params.memberId,
  );
  const alreadyGrantedForThisTerm = existing.some(
    (title) =>
      title.titulo === 'mestre_instalado' &&
      title.dataConcessao !== null &&
      isSameCalendarDay(title.dataConcessao, dataConcessao),
  );
  if (alreadyGrantedForThisTerm) return false;

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
  return true;
}
