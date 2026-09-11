import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { Member } from '../../membership/entities/member.entity';
import type { IMemberRepository } from '../../membership/repositories/member.repository';
import type {
  CentralBusinessEntry,
  MemberCentralProfile,
} from '../entities/member-central-profile.entity';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';

export interface MigrateMemberEmpresaToNegociosDeps {
  memberRepository: IMemberRepository;
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface MigrateMemberEmpresaToNegociosRow {
  memberId: string;
  nomeCompleto: string;
  empresaMigrada: string | null;
  acao: 'criado' | 'ja_existia_negocio_com_mesmo_nome' | 'sem_empresa_preenchida';
}

/**
 * Migração única, disparada pelo Administrador (`/admin/pessoas/central`),
 * do antigo campo solto `Member.empresa` ("Empresa atual") pra dentro de
 * "Empresas e negócios" (`MemberCentralProfile.negocios`) — o conceito
 * separado deixou de existir; tudo vira negócio, com `divulgar: false`
 * (só contato/pareamento por CNPJ, nunca no Diretório) por padrão. Mesmo
 * espírito de `ImportHistoricalBoardTermsUseCase`: idempotente (casa por
 * nome normalizado — rodar de novo não duplica), devolve relatório por
 * linha. Diferente daquele caso, cada Irmão é independente (escreve seu
 * próprio `MemberCentralProfile`), sem necessidade de mapas compartilhados
 * entre segmentos — `Promise.all` é seguro.
 */
export class MigrateMemberEmpresaToNegociosUseCase {
  constructor(private readonly deps: MigrateMemberEmpresaToNegociosDeps) {}

  async execute(ctx: AuthContext): Promise<Result<MigrateMemberEmpresaToNegociosRow[]>> {
    requirePermission(ctx, 'memberCentral:manage');

    const now = this.deps.clock.now();
    const members = await this.loadAllMembers(ctx.tenantId);

    const report = await Promise.all(members.map((member) => this.migrateOne(ctx, member, now)));
    return ok(report);
  }

  private async migrateOne(
    ctx: AuthContext,
    member: Member,
    now: Date,
  ): Promise<MigrateMemberEmpresaToNegociosRow> {
    if (!member.empresa?.trim()) {
      return {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        empresaMigrada: null,
        acao: 'sem_empresa_preenchida',
      };
    }

    const profile = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    const normalizedEmpresa = normalizeNameForSearch(member.empresa);
    const jaTemNegocioIgual = (profile?.negocios ?? []).some(
      (n) => normalizeNameForSearch(n.nomeEmpresa) === normalizedEmpresa,
    );
    if (jaTemNegocioIgual) {
      return {
        memberId: member.id,
        nomeCompleto: member.nomeCompleto,
        empresaMigrada: member.empresa,
        acao: 'ja_existia_negocio_com_mesmo_nome',
      };
    }

    const novoNegocio: CentralBusinessEntry = {
      id: this.deps.idGenerator.next(),
      nomeEmpresa: member.empresa,
      segmento: null,
      cargo: null,
      descricao: null,
      cidade: null,
      telefoneComercial: null,
      siteUrl: null,
      cnpj: null,
      logoUrl: null,
      produtosServicos: [],
      whatsappComercial: null,
      emailComercial: null,
      instagramComercial: null,
      formasAtendimento: [],
      horarioFuncionamento: null,
      ofereceDescontoIrmaos: false,
      descontoDescricao: null,
      divulgar: false,
      // Única entrada resultante = Principal automático, mesma regra de `reconcileNegociosStatus`.
      principal: (profile?.negocios.length ?? 0) === 0,
      status: 'nao_divulgado',
      updatedAt: now,
    };

    if (profile) {
      await this.deps.memberCentralProfileRepository.update({
        ...profile,
        negocios: [...profile.negocios, novoNegocio],
        updatedAt: now,
        updatedBy: ctx.uid,
      });
    } else {
      const novoPerfil: MemberCentralProfile = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        memberId: member.id,
        apresentacao: null,
        interesses: null,
        cidadeExibicao: null,
        areaAtuacao: null,
        areaAtuacaoOutra: null,
        especializacao: null,
        especializacaoOutra: null,
        formacao: null,
        resumoProfissional: null,
        negocios: [novoNegocio],
        competencias: [],
        servicos: [],
        afiliacoes: [],
        lojasVisitadas: null,
        interessesMaconicos: null,
        externalLinks: {
          whatsapp: null,
          instagram: null,
          facebook: null,
          linkedin: null,
          lattes: null,
          site: null,
        },
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.memberCentralProfileRepository.create(novoPerfil);
    }

    return {
      memberId: member.id,
      nomeCompleto: member.nomeCompleto,
      empresaMigrada: member.empresa,
      acao: 'criado',
    };
  }

  private async loadAllMembers(tenantId: string): Promise<Member[]> {
    const all: Member[] = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.deps.memberRepository.search({ tenantId }, { limit: 100, cursor });
      all.push(...page.items);
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }
    return all;
  }
}
