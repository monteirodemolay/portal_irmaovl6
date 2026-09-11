import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';

export interface ColleagueByCnpj {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  cargo: string | null;
}

export interface FindColleaguesByCnpjDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
}

/**
 * "Outros Irmãos nesta empresa" — pedido explícito: com o CNPJ já digitado,
 * o Portal já tem tudo pra mostrar colegas de trabalho automaticamente, sem
 * busca manual por nome (nome de empresa varia demais; CNPJ é exato).
 * Casa contra `negocios[].cnpj` de TODOS os perfis do tenant — não exige
 * `divulgar: true` nem `status: 'published'`, porque achar um colega é
 * institucional/prático (mesmo Irmão só quer saber quem mais trabalha ali),
 * não uma decisão editorial de divulgação pública. Por isso não reaproveita
 * `SearchDirectoryUseCase` (regras de autorização diferentes) — classe
 * própria, mais simples.
 */
export class FindColleaguesByCnpjUseCase {
  constructor(private readonly deps: FindColleaguesByCnpjDeps) {}

  async execute(
    ctx: AuthContext,
    cnpj: string,
    excludeMemberId: string,
  ): Promise<Result<ColleagueByCnpj[]>> {
    requirePermission(ctx, 'memberDirectory:read');

    const normalized = cnpj.replace(/\D/g, '');
    if (normalized.length !== 14) return ok([]);

    const profiles = await this.deps.memberCentralProfileRepository.listByTenant(ctx.tenantId);
    const matches: ColleagueByCnpj[] = [];
    for (const profile of profiles) {
      if (profile.memberId === excludeMemberId) continue;
      const negocio = profile.negocios.find((n) => n.cnpj === normalized);
      if (!negocio) continue;
      const member = await this.deps.memberRepository.findById(profile.memberId);
      if (!member || member.tenantId !== ctx.tenantId || member.deletedAt !== null) continue;
      matches.push({
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        fotoUrl: member.fotoUrl,
        cargo: negocio.cargo,
      });
    }
    return ok(matches);
  }
}
