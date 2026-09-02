import { normalizeNameForSearch, type FamilyPersonFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { FamilyPerson } from '../entities/family-person.entity';
import type { IFamilyPersonRepository } from '../repositories/family-person.repository';

export interface CreateFamilyPersonDeps {
  familyPersonRepository: IFamilyPersonRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

function computeMenorDeIdade(dataNascimento: Date | null, now: Date, fallback: boolean): boolean {
  if (!dataNascimento) return fallback;
  const eighteenthBirthday = new Date(dataNascimento);
  eighteenthBirthday.setFullYear(eighteenthBirthday.getFullYear() + 18);
  return eighteenthBirthday > now;
}

/**
 * Cria um familiar externo (`FamilyPerson`) — ação pessoal, sem
 * `requirePermission`: o critério é o Server Action já ter resolvido
 * `managedByMemberId` a partir do `uid` da sessão (mesmo padrão de
 * `SubmitArchiveContributionUseCase`). O nome é salvo mesmo quando
 * `fraternalLinkStatus` é `'none'` — vínculo fraternal nunca é obrigatório
 * (03_ARQUITETURA_E_DADOS.md).
 *
 * `menorDeIdade` nunca é confiado cegamente do formulário quando a data de
 * nascimento é conhecida: é recalculado aqui a partir de `dataNascimento`,
 * porque a regra de "menor nunca aparece publicado" é privacidade crítica
 * demais para depender só da checagem client-side.
 */
export class CreateFamilyPersonUseCase {
  constructor(private readonly deps: CreateFamilyPersonDeps) {}

  async execute(
    ctx: AuthContext,
    managedByMemberId: string,
    input: FamilyPersonFormValues,
  ): Promise<Result<FamilyPerson>> {
    const now = this.deps.clock.now();
    const menorDeIdade = computeMenorDeIdade(input.dataNascimento, now, input.menorDeIdade);
    // Rede de segurança: se o recálculo descobrir que é menor de idade (ex.:
    // data de nascimento chegou depois da validação Zod do formulário), a
    // visibilidade nunca fica mais aberta que 'private' — regra de
    // integridade não pode depender só da checagem client-side.
    const visibility =
      menorDeIdade && input.visibility !== 'administration' ? 'private' : input.visibility;

    const person: FamilyPerson = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      linkedMemberId: input.linkedMemberId,
      nomeCompleto: input.nomeCompleto,
      nomeBusca: normalizeNameForSearch(input.nomeCompleto),
      fotoUrl: input.fotoUrl,
      dataNascimento: input.dataNascimento,
      dataFalecimento: input.dataFalecimento,
      lifeStatus: input.lifeStatus,
      cidade: input.cidade,
      estado: input.estado,
      pais: input.pais,
      biografia: input.biografia,
      menorDeIdade,
      fraternalLinkStatus: input.fraternalLinkStatus,
      visibility,
      reviewStatus: 'draft',
      sourceKind: input.sourceKind,
      sourceDescription: input.sourceDescription,
      managedByMemberId,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };

    await this.deps.familyPersonRepository.create(person);
    return ok(person);
  }
}
