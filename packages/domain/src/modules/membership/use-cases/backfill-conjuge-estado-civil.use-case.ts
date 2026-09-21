import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IMemberRepository } from '../repositories/member.repository';

export interface BackfillConjugeEstadoCivilDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

export interface BackfillConjugeEstadoCivilResult {
  totalSemEstadoCivil: number;
  corrigidos: Array<{ memberId: string; nomeCompleto: string }>;
}

/**
 * Corrige `Member.estadoCivil` de quem já tem `conjugeNome` preenchido
 * (importação em massa de aniversários — `ImportBirthdayDataUseCase`/
 * `ImportConsolidatedReportUseCase` — grava `conjugeNome` diretamente,
 * sem nunca tocar `estadoCivil`) mas ficou com `estadoCivil: null`. Efeito
 * visível, os dois relatados pelo Administrador: (1) `AddressMaritalCard`
 * escondia os campos da cônjuge no formulário de edição porque
 * `maritalStatusHasSpouse(null)` é `false`; (2) salvar esse formulário sem
 * notar os campos ocultos disparava `normalizeConjugeFields`, que ZERAVA
 * `conjugeNome`/`conjugeAniversarioDia`/`conjugeAniversarioMes` por
 * `estadoCivil` não estar entre os que implicam cônjuge — apagando o dado
 * importado.
 *
 * Marca como `'casado'` por padrão — decisão explícita do Administrador
 * (não dá pra saber, só pelo nome da cônjuge, se é casamento civil, união
 * estável etc.; a Secretaria ajusta caso a caso depois). Seguro rodar de
 * novo: só mexe em quem ainda está com `estadoCivil: null` E `conjugeNome`
 * preenchido.
 */
export class BackfillConjugeEstadoCivilUseCase {
  constructor(private readonly deps: BackfillConjugeEstadoCivilDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BackfillConjugeEstadoCivilResult>> {
    requirePermission(ctx, 'member:manage');

    const pendentes: Array<{ id: string; nomeCompleto: string }> = [];
    let cursor: string | undefined;
    for (;;) {
      const page = await this.deps.memberRepository.search(
        { tenantId: ctx.tenantId },
        { limit: 100, cursor },
      );
      for (const member of page.items) {
        if (member.conjugeNome && !member.estadoCivil) {
          pendentes.push({ id: member.id, nomeCompleto: member.nomeCompleto });
        }
      }
      if (!page.hasMore || !page.nextCursor) break;
      cursor = page.nextCursor;
    }

    const now = this.deps.clock.now();
    const corrigidos: BackfillConjugeEstadoCivilResult['corrigidos'] = [];

    for (const { id, nomeCompleto } of pendentes) {
      const member = await this.deps.memberRepository.findById(id);
      if (!member || !member.conjugeNome || member.estadoCivil) continue;

      await this.deps.memberRepository.update({
        ...member,
        estadoCivil: 'casado',
        updatedAt: now,
        updatedBy: ctx.uid,
      });
      corrigidos.push({ memberId: id, nomeCompleto });
    }

    return ok({
      totalSemEstadoCivil: pendentes.length,
      corrigidos,
    });
  }
}
