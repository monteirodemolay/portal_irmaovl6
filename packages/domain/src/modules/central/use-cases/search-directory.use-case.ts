import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { ok, type Result } from '../../../shared/result';
import {
  buildPublicMemberProfileDTO,
  type PublicMemberProfileDTO,
} from '../dtos/public-member-profile.dto';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IPublicationSettingsRepository } from '../repositories/publication-settings.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface SearchDirectoryDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  publicationSettingsRepository: IPublicationSettingsRepository;
}

export interface SearchDirectoryInput {
  termo?: string;
}

/**
 * Diretório/busca — só sobre perfis publicados (requisito central). Sem
 * full-text nativo no Firestore: mesma estratégia de `SearchMembersUseCase`
 * (filtro estruturado no repositório + filtro de texto em memória, no
 * servidor). Crítico: o filtro de texto roda sobre o DTO já publicado
 * (`areaAtuacao`/`negocios` só presentes quando o bloco está ligado), nunca
 * sobre `Member.profissao` bruto — um Irmão com profissão "Médico" mas
 * bloco profissional desligado não aparece buscando "médico".
 */
export class SearchDirectoryUseCase {
  constructor(private readonly deps: SearchDirectoryDeps) {}

  async execute(
    ctx: AuthContext,
    input: SearchDirectoryInput = {},
  ): Promise<Result<PublicMemberProfileDTO[]>> {
    requirePermission(ctx, 'memberDirectory:read');

    const refs = await this.deps.publicationSettingsRepository.listPublishedByTenant(ctx.tenantId);

    const dtos = await Promise.all(
      refs.map(async (ref) => {
        const [member, settings, profile] = await Promise.all([
          this.deps.memberRepository.findById(ref.memberId),
          this.deps.publicationSettingsRepository.findByMemberId(ctx.tenantId, ref.memberId),
          this.deps.memberCentralProfileRepository.findByMemberId(ctx.tenantId, ref.memberId),
        ]);
        if (!member || !settings) return null;
        return buildPublicMemberProfileDTO(member, profile, settings);
      }),
    );

    let items = dtos.filter((dto): dto is PublicMemberProfileDTO => dto !== null);

    const needle = input.termo?.trim().toLowerCase();
    if (needle) {
      items = items.filter((dto) => {
        const haystack = [
          dto.nomeCompleto,
          dto.profissional?.areaAtuacao,
          dto.profissional?.resumoProfissional,
          ...(dto.negocios?.map((n) => n.nomeEmpresa) ?? []),
        ]
          .filter((v): v is string => Boolean(v))
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      });
    }

    return ok(items);
  }
}
