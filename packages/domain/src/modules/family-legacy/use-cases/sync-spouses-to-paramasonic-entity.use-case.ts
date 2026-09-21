import { MARITAL_STATUSES_WITH_SPOUSE } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { err, NotFoundError, ValidationError, ok, type Result } from '../../../shared/result';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { ParamasonicEntityMember } from '../entities/paramasonic-entity-member.entity';
import type { IParamasonicEntityMemberRepository } from '../repositories/paramasonic-entity-member.repository';
import type { IParamasonicEntityRepository } from '../repositories/paramasonic-entity.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

export interface SyncSpousesToParamasonicEntityDeps {
  paramasonicEntityMemberRepository: IParamasonicEntityMemberRepository;
  paramasonicEntityRepository: IParamasonicEntityRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export interface SyncSpousesToParamasonicEntityResult {
  totalConjugesCadastrados: number;
  adicionados: { nomeCompleto: string; doIrmao: string }[];
  jaExistentes: number;
  irmaosSemConjugeCadastrado: { memberId: string; nomeCompleto: string }[];
}

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

/**
 * Sincroniza o cadastro simples de cônjuge do `Member` (`conjugeNome`,
 * preenchido no cadastro/importação do Irmão — distinto do módulo Família e
 * Legado / `FamilyPerson`, que é um vínculo mais rico e opcional via "Meu
 * Espaço") como Integrante do corpo próprio de uma `ParamasonicEntity` do
 * tipo Fraternidade Feminina. Idempotente: nunca duplica quem já está na
 * lista (comparação por nome normalizado), então é seguro rodar de novo
 * depois de novos Irmãos serem cadastrados. Também devolve quem ainda não
 * tem cônjuge cadastrado apesar do estado civil implicar um, pra
 * complementar o cadastro manualmente.
 */
export class SyncSpousesToParamasonicEntityUseCase {
  constructor(private readonly deps: SyncSpousesToParamasonicEntityDeps) {}

  async execute(
    ctx: AuthContext,
    entityId: string,
  ): Promise<Result<SyncSpousesToParamasonicEntityResult>> {
    requirePermission(ctx, 'paramasonicEntity:manage');

    const entity = await this.deps.paramasonicEntityRepository.findById(entityId);
    if (!entity || entity.tenantId !== ctx.tenantId || entity.deletedAt) {
      return err(new NotFoundError('ParamasonicEntity', entityId));
    }
    if (entity.kind !== 'female_fraternity') {
      return err(
        new ValidationError(
          'Sincronização de cônjuges só está disponível para Fraternidade Feminina.',
        ),
      );
    }

    const { items: members } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 1000 },
    );

    const existingEntityMembers = await this.deps.paramasonicEntityMemberRepository.listByEntity(
      ctx.tenantId,
      entityId,
    );
    const existingNames = new Set(
      existingEntityMembers
        .filter((m) => !m.memberId && m.nomeCompleto)
        .map((m) => normalizeName(m.nomeCompleto!)),
    );
    // Prioriza o vínculo (`conjugeDeMemberId`) sobre o nome: cobre o caso de
    // a esposa já ter sido desvinculada manualmente (separação) e o nome
    // continuar batendo — nesse caso ela NÃO deve ser recriada. Casos
    // legados sem vínculo (sincronizados antes deste campo existir, ou
    // cadastrados manualmente) continuam protegidos só pelo nome.
    const existingByMemberId = new Set(
      existingEntityMembers.filter((m) => m.conjugeDeMemberId).map((m) => m.conjugeDeMemberId!),
    );

    const now = this.deps.clock.now();
    const adicionados: SyncSpousesToParamasonicEntityResult['adicionados'] = [];
    const irmaosSemConjugeCadastrado: SyncSpousesToParamasonicEntityResult['irmaosSemConjugeCadastrado'] =
      [];
    let totalConjugesCadastrados = 0;
    let jaExistentes = 0;

    for (const member of members) {
      const conjugeNome = member.conjugeNome?.trim();
      if (!conjugeNome) {
        if (member.estadoCivil && MARITAL_STATUSES_WITH_SPOUSE.includes(member.estadoCivil)) {
          irmaosSemConjugeCadastrado.push({
            memberId: member.id,
            nomeCompleto: member.nomeCompleto,
          });
        }
        continue;
      }

      totalConjugesCadastrados += 1;
      if (existingByMemberId.has(member.id)) {
        jaExistentes += 1;
        continue;
      }
      const normalized = normalizeName(conjugeNome);
      if (existingNames.has(normalized)) {
        jaExistentes += 1;
        continue;
      }

      const entityMember: ParamasonicEntityMember = {
        id: this.deps.idGenerator.next(),
        tenantId: ctx.tenantId,
        entityId,
        memberId: null,
        nomeCompleto: conjugeNome,
        contato: null,
        cargo: null,
        categoria: null,
        situacao: 'ativo',
        dataIngresso: null,
        conjugeDeMemberId: member.id,
        createdAt: now,
        updatedAt: now,
        createdBy: ctx.uid,
        updatedBy: ctx.uid,
        deletedAt: null,
        status: 'active',
        ativo: true,
      };
      await this.deps.paramasonicEntityMemberRepository.create(entityMember);
      existingNames.add(normalized);
      adicionados.push({ nomeCompleto: conjugeNome, doIrmao: member.nomeCompleto });
    }

    adicionados.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'));
    irmaosSemConjugeCadastrado.sort((a, b) =>
      a.nomeCompleto.localeCompare(b.nomeCompleto, 'pt-BR'),
    );

    return ok({ totalConjugesCadastrados, adicionados, jaExistentes, irmaosSemConjugeCadastrado });
  }
}
