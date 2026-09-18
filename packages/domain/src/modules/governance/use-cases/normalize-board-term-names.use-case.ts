import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IBoardTermRepository } from '../repositories/board-term.repository';

export interface NormalizeBoardTermNamesResult {
  totalGestoes: number;
  corrigidas: { id: string; nomeAnterior: string; nomeNovo: string }[];
}

/**
 * Correção retroativa, um clique: remove o prefixo "Gestão " (redundante —
 * a palavra já é adicionada pela UI em vários lugares, ex. Perfil do
 * Irmão) do `nome` de toda gestão já cadastrada. Seguro rodar mais de uma
 * vez — só atualiza quem ainda tem o prefixo.
 */
export class NormalizeBoardTermNamesUseCase {
  constructor(
    private readonly deps: { boardTermRepository: IBoardTermRepository; clock: IClock },
  ) {}

  async execute(ctx: AuthContext): Promise<Result<NormalizeBoardTermNamesResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const terms = await this.deps.boardTermRepository.listByTenant(ctx.tenantId);
    const now = this.deps.clock.now();
    const corrigidas: NormalizeBoardTermNamesResult['corrigidas'] = [];

    for (const term of terms) {
      const nomeNovo = term.nome.replace(/^\s*gest[ãa]o\s+/i, '').trim();
      if (nomeNovo === term.nome || !nomeNovo) continue;

      await this.deps.boardTermRepository.update({
        ...term,
        nome: nomeNovo,
        updatedAt: now,
        updatedBy: ctx.uid,
      });
      corrigidas.push({ id: term.id, nomeAnterior: term.nome, nomeNovo });
    }

    return ok({ totalGestoes: terms.length, corrigidas });
  }
}
