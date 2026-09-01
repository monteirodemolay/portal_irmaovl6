import type { MemberCentralProfileValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type {
  CentralBusinessEntry,
  MemberCentralProfile,
} from '../entities/member-central-profile.entity';
import type { IMemberCentralProfileRepository } from '../repositories/member-central-profile.repository';
import type { IMemberRepository } from '../../membership/repositories/member.repository';

/**
 * `status`/`updatedAt` de cada negócio nunca vêm do formulário (schema de
 * input só valida conteúdo) — computados aqui comparando contra o que já
 * existia, casado por `id` (estável, gerado no cliente ao adicionar uma
 * entrada e mantido entre edições — ver `EmpresaTab`). Entrada nova ou com
 * conteúdo alterado sempre volta pra fila de revisão (`pending_review`),
 * mesmo que já estivesse publicada antes — a Administração aprova o
 * conteúdo, não a intenção de publicar. Entrada idêntica mantém o status e
 * a data que já tinha (não "reseta a fila" por causa de outro bloco do
 * formulário ter sido salvo junto).
 */
function sameStringArray(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, i) => value === b[i]);
}

export function reconcileNegociosStatus(
  input: MemberCentralProfileValues['negocios'],
  currentNegocios: CentralBusinessEntry[],
  now: Date,
): CentralBusinessEntry[] {
  const currentById = new Map(currentNegocios.map((n) => [n.id, n]));
  return input.map((entry) => {
    const previous = currentById.get(entry.id);
    const unchanged =
      previous &&
      previous.nomeEmpresa === entry.nomeEmpresa &&
      previous.segmento === entry.segmento &&
      previous.cargo === entry.cargo &&
      previous.descricao === entry.descricao &&
      previous.cidade === entry.cidade &&
      previous.telefoneComercial === entry.telefoneComercial &&
      previous.siteUrl === entry.siteUrl &&
      previous.cnpj === entry.cnpj &&
      previous.logoUrl === entry.logoUrl &&
      previous.whatsappComercial === entry.whatsappComercial &&
      previous.emailComercial === entry.emailComercial &&
      previous.instagramComercial === entry.instagramComercial &&
      previous.horarioFuncionamento === entry.horarioFuncionamento &&
      previous.ofereceDescontoIrmaos === entry.ofereceDescontoIrmaos &&
      previous.descontoDescricao === entry.descontoDescricao &&
      sameStringArray(previous.produtosServicos, entry.produtosServicos) &&
      sameStringArray(previous.formasAtendimento, entry.formasAtendimento);

    if (unchanged) {
      return { ...entry, status: previous.status, updatedAt: previous.updatedAt };
    }
    return { ...entry, status: 'pending_review' as const, updatedAt: now };
  });
}

export interface UpdateCentralProfileDeps {
  memberCentralProfileRepository: IMemberCentralProfileRepository;
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Salva o CONTEÚDO dos blocos da Central — nunca mexe em visibilidade
 * (ver `UpdatePublicationSettingsUseCase`, uma decisão separada;
 * "cadastrar ≠ publicar"). `memberId` nunca vem de input — sempre resolvido
 * da própria sessão (`findByUserId`), então não há como um Irmão editar o
 * perfil de outro só trocando um parâmetro. Cria o documento sob demanda na
 * primeira vez (lazy) — sem backfill necessário pros Irmãos já cadastrados.
 */
export class UpdateCentralProfileUseCase {
  constructor(private readonly deps: UpdateCentralProfileDeps) {}

  async execute(
    ctx: AuthContext,
    input: MemberCentralProfileValues,
  ): Promise<Result<MemberCentralProfile>> {
    requirePermission(ctx, 'memberCentral:update');

    const member = await this.deps.memberRepository.findByUserId(ctx.tenantId, ctx.uid);
    if (!member) {
      return err(new NotFoundError('Member', ctx.uid));
    }

    const current = await this.deps.memberCentralProfileRepository.findByMemberId(
      ctx.tenantId,
      member.id,
    );
    const now = this.deps.clock.now();
    const negocios = reconcileNegociosStatus(input.negocios, current?.negocios ?? [], now);

    const updated: MemberCentralProfile = current
      ? { ...current, ...input, negocios, updatedAt: now, updatedBy: ctx.uid }
      : {
          id: this.deps.idGenerator.next(),
          tenantId: ctx.tenantId,
          memberId: member.id,
          ...input,
          negocios,
          createdAt: now,
          updatedAt: now,
          createdBy: ctx.uid,
          updatedBy: ctx.uid,
          deletedAt: null,
          status: 'active',
          ativo: true,
        };

    if (current) {
      await this.deps.memberCentralProfileRepository.update(updated);
    } else {
      await this.deps.memberCentralProfileRepository.create(updated);
    }

    return ok(updated);
  }
}
