import { TERMINAL_MEMBER_SITUATIONS, type MemberDegree } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { computeNextOccurrence } from './anniversary-date';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export type AnniversaryKind = 'iniciacao' | 'elevacao' | 'exaltacao' | 'nascimento';

export interface UpcomingAnniversaryEntry {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  grau: MemberDegree;
  kind: AnniversaryKind;
  data: Date;
  anosCompletos: number;
  diasAte: number;
}

export interface ListUpcomingAnniversariesDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

export interface ListUpcomingAnniversariesInput {
  /** Janela de dias à frente considerada (padrão 7 — "esta semana"). */
  withinDays?: number;
}

const KIND_FIELDS: Array<[AnniversaryKind, keyof Member]> = [
  ['iniciacao', 'dataIniciacao'],
  ['elevacao', 'dataElevacao'],
  ['exaltacao', 'dataExaltacao'],
  ['nascimento', 'dataNascimento'],
];

/**
 * Painel "Hoje/Esta semana na Loja" da Tela Principal — computa em tempo de
 * request a partir das datas já cadastradas no Member (iniciação, elevação,
 * exaltação, nascimento), sem gravar `Event`/depender do cron
 * `birthday-reminder`. É dado cadastral administrativo, não dado voluntário
 * da Central VL6 — por isso exige só `member:read` (que todo Irmão já tem),
 * aparecendo mesmo para quem nunca publicou nada na Central.
 */
export class ListUpcomingAnniversariesUseCase {
  constructor(private readonly deps: ListUpcomingAnniversariesDeps) {}

  async execute(
    ctx: AuthContext,
    input: ListUpcomingAnniversariesInput = {},
  ): Promise<UpcomingAnniversaryEntry[]> {
    requirePermission(ctx, 'member:read');

    const withinDays = input.withinDays ?? 7;
    const hoje = this.deps.clock.now();

    const { items } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 1000 },
    );

    const entries: UpcomingAnniversaryEntry[] = [];
    for (const member of items) {
      if (TERMINAL_MEMBER_SITUATIONS.includes(member.situacao)) continue;

      for (const [kind, field] of KIND_FIELDS) {
        const data = member[field];
        if (!(data instanceof Date)) continue;

        const { diasAte, anosCompletos } = computeNextOccurrence(hoje, data);
        if (diasAte > withinDays) continue;

        entries.push({
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          fotoUrl: member.fotoUrl,
          grau: member.grau,
          kind,
          data,
          anosCompletos,
          diasAte,
        });
      }
    }

    return entries.sort((a, b) => {
      if (a.diasAte !== b.diasAte) return a.diasAte - b.diasAte;
      if (a.kind !== b.kind) return a.kind === 'nascimento' ? 1 : -1;
      return a.nomeCompleto.localeCompare(b.nomeCompleto);
    });
  }
}
