import type { HonorTypeKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { err, ValidationError, ok, type Result } from '../../../shared/result';
import type { Honor } from '../entities/honor.entity';
import type { IHonorRepository } from '../repositories/honor.repository';

export interface RegisterHonorInput {
  /** `null` quando o homenageado não é um Irmão cadastrado (ver `Honor`). */
  memberId: string | null;
  homenageadoNome: string | null;
  homenageadoLojaOrigem: string | null;
  homenageadoOriente: string | null;
  nomeOficial: string;
  tipo: HonorTypeKey;
  instituicaoConcedente: string;
  data: Date | null;
  numeroAto: string | null;
  motivo: string | null;
  descricaoHistorica: string | null;
  diplomaFileId: string | null;
  fotoEntregaFileId: string | null;
}

export interface RegisterHonorDeps {
  honorRepository: IHonorRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cadastro de uma Honraria/Condecoração (Fase 3 do domínio de Honrarias) —
 * ver `Honor`. Exige `memberId` OU `homenageadoNome` (nunca os dois vazios
 * — precisa saber quem foi homenageado de algum jeito), nunca os dois
 * preenchidos ao mesmo tempo (exclusão mútua documentada na entidade).
 */
export class RegisterHonorUseCase {
  constructor(private readonly deps: RegisterHonorDeps) {}

  async execute(ctx: AuthContext, input: RegisterHonorInput): Promise<Result<Honor>> {
    requirePermission(ctx, 'honor:manage');

    if (!input.memberId && !input.homenageadoNome) {
      return err(
        new ValidationError('Informe o Irmão cadastrado ou o nome do homenageado externo.'),
      );
    }
    if (input.memberId && input.homenageadoNome) {
      return err(
        new ValidationError(
          'Escolha um Irmão cadastrado OU um homenageado externo, nunca os dois.',
        ),
      );
    }
    if (!input.nomeOficial.trim()) {
      return err(new ValidationError('Nome oficial da honraria é obrigatório.'));
    }
    if (!input.instituicaoConcedente.trim()) {
      return err(new ValidationError('Instituição concedente é obrigatória.'));
    }

    const now = this.deps.clock.now();
    const honor: Honor = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      memberId: input.memberId,
      homenageadoNome: input.memberId ? null : input.homenageadoNome,
      homenageadoLojaOrigem: input.memberId ? null : input.homenageadoLojaOrigem,
      homenageadoOriente: input.memberId ? null : input.homenageadoOriente,
      nomeOficial: input.nomeOficial.trim(),
      tipo: input.tipo,
      instituicaoConcedente: input.instituicaoConcedente.trim(),
      data: input.data,
      numeroAto: input.numeroAto,
      motivo: input.motivo,
      descricaoHistorica: input.descricaoHistorica,
      diplomaFileId: input.diplomaFileId,
      fotoEntregaFileId: input.fotoEntregaFileId,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.honorRepository.create(honor);

    return ok(honor);
  }
}
