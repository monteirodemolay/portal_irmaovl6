import type { AuthContext } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import {
  CEREMONY_ORIGEM_FIELD,
  findCeremonyArchiveItem,
  type CeremonyMateKind,
} from '../lib/get-ceremony-mates';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface RemoveMemberFromCeremonyArchiveItemInput {
  memberId: string;
  tipo: CeremonyMateKind;
  /** Data maçônica ANTERIOR (antes da correção) — é nela que a sessão errada foi criada/associada. */
  previousDate: Date;
}

export interface RemoveMemberFromCeremonyArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  eventRepository: IEventRepository;
  clock: IClock;
}

/**
 * Desfaz o vínculo criado por `CreateInitiationArchiveItemUseCase` e
 * equivalentes quando uma data maçônica é CORRIGIDA (não apagada) — sem
 * isso, corrigir uma data errada deixava o Irmão "esquecido" na sessão do
 * dia antigo (`origem*MemberIds`) para sempre: aparecia como colega de
 * cerimônia de quem realmente foi iniciado/elevado/exaltado naquele dia
 * errado, e a nova sessão (dia certo) ganhava um segundo registro dele,
 * duplicado. Só remove o `memberId` da lista — nunca apaga o
 * `ArchiveItem`/`Event` em si (podem ter fotos/documentos anexados por um
 * Administrador, ou outros Irmãos genuinamente cerimoniados naquele dia).
 *
 * Chamado sempre ANTES do `CreateXArchiveItemUseCase` da data nova, e só
 * quando a data efetivamente mudou (quem chama decide isso comparando o
 * valor antigo com o novo) — sem isso, toda edição de Irmão sem trocar a
 * data varreria a Agenda à toa. Mesmo tratamento silencioso de "não achei
 * nada" dos demais casos de uso deste módulo: nenhuma sessão encontrada
 * pra data antiga (evento já apagado, nunca existiu) não é erro.
 *
 * Deliberadamente sem `requirePermission` própria — mesmo espírito de
 * `CreateInitiationArchiveItemUseCase`: efeito colateral interno de quem
 * chama (`member:update`), nunca uma ação disparável isoladamente.
 */
export class RemoveMemberFromCeremonyArchiveItemUseCase {
  constructor(private readonly deps: RemoveMemberFromCeremonyArchiveItemDeps) {}

  async execute(ctx: AuthContext, input: RemoveMemberFromCeremonyArchiveItemInput): Promise<void> {
    const origemField = CEREMONY_ORIGEM_FIELD[input.tipo];
    const found = await findCeremonyArchiveItem(
      this.deps,
      ctx.tenantId,
      input.memberId,
      input.previousDate,
      origemField,
    );
    if (!found) return;

    const currentIds = found.item[origemField] ?? [];
    if (!currentIds.includes(input.memberId)) return;

    const updated: ArchiveItem = {
      ...found.item,
      [origemField]: currentIds.filter((id) => id !== input.memberId),
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.archiveItemRepository.update(updated);
  }
}
