import { areNormalizedNamesSimilar, normalizeNameForSearch } from '@vl6/shared';
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
 * Acha Irmãos cadastrados mais de uma vez — mesmo nome (normalizado, sem
 * acento/maiúscula) OU nome PARECIDO (`areNormalizedNamesSimilar` —
 * distância de edição pequena, ex.: "Souza"×"Sousa", "Ivan"×"Ivam"), pra
 * pegar tanto o caso óbvio quanto o erro de digitação sutil. Nunca junta
 * automaticamente, só lista pra o Administrador decidir qual manter em
 * `MergeDuplicateMembersUseCase`. Não filtra `deletedAt`: um cadastro já
 * mesclado/excluído continua aparecendo até o Administrador confirmar que
 * não sobrou mais nada duplicado, evitando "sumiço" silencioso de um
 * registro que ele esperava ver.
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

    // Une chaves de nome exatamente iguais (já agrupadas acima) com chaves
    // PARECIDAS entre si (union-find sobre os nomes normalizados distintos
    // — poucas dezenas/centenas por Loja, então O(n²) não pesa).
    const keys = Array.from(groupKeys.keys());
    const parent = new Map(keys.map((key) => [key, key]));
    function find(key: string): string {
      let root = key;
      while (parent.get(root) !== root) root = parent.get(root)!;
      return root;
    }
    function union(a: string, b: string): void {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA !== rootB) parent.set(rootA, rootB);
    }
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (areNormalizedNamesSimilar(keys[i]!, keys[j]!)) union(keys[i]!, keys[j]!);
      }
    }

    const merged = new Map<string, DuplicateMemberSummary[]>();
    for (const key of keys) {
      const root = find(key);
      const list = merged.get(root) ?? [];
      list.push(...groupKeys.get(key)!);
      merged.set(root, list);
    }

    const groups: DuplicateMemberGroup[] = Array.from(merged.entries())
      .filter(([, membros]) => membros.length > 1)
      .map(([nomeNormalizado, membros]) => ({
        nomeNormalizado,
        membros: membros.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      }))
      .sort((a, b) => a.membros[0]!.nomeCompleto.localeCompare(b.membros[0]!.nomeCompleto));

    return ok(groups);
  }
}
