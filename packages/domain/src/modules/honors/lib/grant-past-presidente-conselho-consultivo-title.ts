import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { MemberTitle } from '../entities/member-title.entity';
import type { IMemberTitleRepository } from '../repositories/member-title.repository';

export interface GrantPastPresidenteConselhoConsultivoTitleDeps {
  memberTitleRepository: IMemberTitleRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface GrantPastPresidenteConselhoConsultivoTitleParams {
  tenantId: string;
  memberId: string;
  uid: string;
  fundamento: string;
}

/**
 * Mesma convenção institucional do Mestre Instalado (`grantMestreInstaladoTitleIfNeeded`),
 * aplicada ao Conselho Consultivo de um Capítulo DeMolay: um Irmão que
 * exerceu a Presidência do Conselho Consultivo vira Past-Presidente do
 * Conselho Consultivo. Diferente do Mestre Instalado, aqui não há uma data
 * de fim de gestão vinda de um sistema estruturado — a marcação é manual,
 * feita pelo Administrador ao revisar os integrantes "Maçom/Tio" de uma
 * entidade paramaçônica (`UpdateParamasonicEntityMemberUseCase`), então o
 * título é concedido sem data precisa. Idempotente: nunca duplica o título,
 * mesmo marcado mais de uma vez.
 */
export async function grantPastPresidenteConselhoConsultivoTitleIfNeeded(
  deps: GrantPastPresidenteConselhoConsultivoTitleDeps,
  params: GrantPastPresidenteConselhoConsultivoTitleParams,
): Promise<void> {
  const existing = await deps.memberTitleRepository.listByMemberId(
    params.tenantId,
    params.memberId,
  );
  if (existing.some((title) => title.titulo === 'past_presidente_conselho_consultivo')) return;

  const now = deps.clock.now();
  const title: MemberTitle = {
    id: deps.idGenerator.next(),
    tenantId: params.tenantId,
    memberId: params.memberId,
    titulo: 'past_presidente_conselho_consultivo',
    tituloOutro: null,
    dataConcessao: null,
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
