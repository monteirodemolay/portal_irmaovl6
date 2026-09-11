import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../repositories/member.repository';

export interface ListDuplicateMembersDeps {
  memberRepository: IMemberRepository;
}

export interface DuplicateMemberSummary {
  id: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  situacao: string;
  /** Já tem login vinculado (`userId`) — geralmente o candidato certo a manter como cadastro canônico. */
  temAcesso: boolean;
  createdAt: Date;
}

export interface DuplicateMemberGroup {
  nomeNormalizado: string;
  membros: DuplicateMemberSummary[];
}

/**
 * Acha Irmãos com o mesmo nome (normalizado — sem acento/maiúscula,
 * mesma chave usada pela importação da nominata histórica) cadastrados mais
 * de uma vez — nunca junta automaticamente, só lista pra o Administrador
 * decidir qual manter em `MergeDuplicateMembersUseCase`. Não filtra
 * `deletedAt`: um cadastro já mesclado/excluído continua aparecendo até o
 * Administrador confirmar que não sobrou mais nada duplicado, evitando
 * "sumiço" silencioso de um registro que ele esperava ver.
 */
export class ListDuplicateMembersUseCase {
  constructor(private readonly deps: ListDuplicateMembersDeps) {}

  async execute(ctx: AuthContext): Promise<Result<DuplicateMemberGroup[]>> {
    requirePermission(ctx, 'member:manage');

    const groupKeys = new Map<string, DuplicateMemberSummary[]>();
    let cursor: string | undefined;
    for (;;) {
      const page = await this.deps.memberRepository.search(
        { tenantId: ctx.tenantId },
        { limit: 100, cursor },
      );
      for (const member of page.items) {
        if (member.deletedAt) continue;
        const key = normalizeNameForSearch(member.nomeCompleto);
        const list = groupKeys.get(key) ?? [];
        list.push({
          id: member.id,
          nomeCompleto: member.nomeCompleto,
          fotoUrl: member.fotoUrl,
          situacao: member.situacao,
          temAcesso: member.userId !== null,
          createdAt: member.createdAt,
        });
        groupKeys.set(key, list);
      }
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    const groups: DuplicateMemberGroup[] = Array.from(groupKeys.entries())
      .filter(([, membros]) => membros.length > 1)
      .map(([nomeNormalizado, membros]) => ({
        nomeNormalizado,
        membros: membros.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      }))
      .sort((a, b) => a.membros[0]!.nomeCompleto.localeCompare(b.membros[0]!.nomeCompleto));

    return ok(groups);
  }
}
