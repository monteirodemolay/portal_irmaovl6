import { areNormalizedNamesSimilar, normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Member, MemberChild } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface DedupeMemberChildrenDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

export interface DedupeMemberChildrenResultRow {
  memberId: string;
  nomeCompleto: string;
  removidos: string[];
}

/**
 * Remove filhos duplicados por grafia — achado ao investigar por que
 * apareciam repetidos em "Cônjuge e filhos" (Cadastro de Irmãos): as duas
 * importações institucionais (`ImportBirthdayDataUseCase`, relatório GLEG;
 * `ImportConsolidatedReportUseCase`, planilha consolidada) só dedupam por
 * nome normalizado EXATO — uma mesma pessoa grafada diferente nas duas
 * fontes (ex.: "Eduardo Garcez de Moares" × "Eduardo Garcez de Moraes", uma
 * letra) passa pelas duas e vira duas entradas em `Member.filhos`.
 *
 * Dentro de cada Irmão, agrupa filhos cujo nome é "parecido o bastante pra
 * ser erro de digitação" (`areNormalizedNamesSimilar`, mesmo limiar
 * conservador — distância ≤ 2 e ≤ 20% do nome — usado em
 * `ImportHistoricalBoardTermsUseCase`) E que têm o mesmo dia/mês de
 * aniversário — a coincidência dupla (nome quase igual + mesma data)
 * descarta a hipótese de serem dois filhos distintos (ex.: gêmeos com nomes
 * parecidos teriam a mesma data mas nomes normalmente bem diferentes;
 * dois filhos com nomes por acaso parecidos quase certamente não fazem
 * aniversário no mesmo dia). Mantém a entrada mais antiga do grupo
 * (primeira na lista) e remove as demais. Seguro rodar de novo: sem
 * duplicata, não mexe em nada.
 */
export class DedupeMemberChildrenUseCase {
  constructor(private readonly deps: DedupeMemberChildrenDeps) {}

  async execute(ctx: AuthContext): Promise<Result<DedupeMemberChildrenResultRow[]>> {
    requirePermission(ctx, 'member:manage');

    const now = this.deps.clock.now();
    const results: DedupeMemberChildrenResultRow[] = [];
    let cursor: string | undefined;

    for (;;) {
      const page = await this.deps.memberRepository.search(
        { tenantId: ctx.tenantId },
        { limit: 100, cursor },
      );

      for (const member of page.items) {
        const { kept, removed } = dedupeChildren(member.filhos);
        if (removed.length > 0) {
          await this.deps.memberRepository.update({
            ...member,
            filhos: kept,
            updatedAt: now,
            updatedBy: ctx.uid,
          } satisfies Member);
          results.push({
            memberId: member.id,
            nomeCompleto: member.nomeCompleto,
            removidos: removed.map((filho) => filho.nome),
          });
        }
      }

      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    return ok(results);
  }
}

function dedupeChildren(filhos: MemberChild[]): { kept: MemberChild[]; removed: MemberChild[] } {
  const kept: MemberChild[] = [];
  const removed: MemberChild[] = [];

  for (const filho of filhos) {
    const duplicateOfKept = kept.some((existing) => isSameChild(existing, filho));
    if (duplicateOfKept) {
      removed.push(filho);
    } else {
      kept.push(filho);
    }
  }

  return { kept, removed };
}

function isSameChild(a: MemberChild, b: MemberChild): boolean {
  if (a.aniversarioDia !== b.aniversarioDia || a.aniversarioMes !== b.aniversarioMes) {
    return false;
  }
  const nomeA = normalizeNameForSearch(a.nome);
  const nomeB = normalizeNameForSearch(b.nome);
  return nomeA === nomeB || areNormalizedNamesSimilar(nomeA, nomeB);
}
