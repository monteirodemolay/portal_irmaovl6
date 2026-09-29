import { TERMINAL_MEMBER_SITUATION_STATUSES, type MemberDegree } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { computeNextOccurrence } from './anniversary-date';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export type AnniversaryKind =
  'iniciacao' | 'elevacao' | 'exaltacao' | 'nascimento' | 'conjuge' | 'filho';

export interface UpcomingAnniversaryEntry {
  memberId: string;
  nomeCompleto: string;
  fotoUrl: string | null;
  grau: MemberDegree;
  kind: AnniversaryKind;
  data: Date;
  /**
   * Dia/mês da ocorrência como números — usados pela UI pra exibir a data
   * (`anniversaryHeadline`), nunca `data` diretamente. Ver o comentário de
   * `NextOccurrence.dia`/`mes` em `anniversary-date.ts`: um `Date` que
   * atravessa a fronteira servidor/cliente do React (este painel é um
   * Client Component) é reconstruído no fuso do navegador do Irmão, o que
   * pode deslocar o dia exibido (bug relatado pelo Administrador).
   */
  dia: number;
  mes: number;
  /**
   * Nunca exibido pra `nascimento`/`conjuge`/`filho` (convenção da UI, ver
   * `anniversaryHeadline`) — pra `conjuge`/`filho` sem ano conhecido
   * (`conjugeAniversarioDia/Mes`, `MemberChild`), este número não representa
   * uma idade real, só sobra do cálculo de `computeNextOccurrence` sobre um
   * ano fictício.
   */
  anosCompletos: number;
  diasAte: number;
  /** Só preenchido para `kind === 'conjuge'` — nome de quem faz aniversário. */
  conjugeNome: string | null;
  /** Só preenchido para `kind === 'filho'` — nome de quem faz aniversário. */
  filhoNome: string | null;
}

/**
 * Ano fictício usado só pra montar um `Date` de dia/mês sem ano conhecido
 * (cônjuge sem `conjugeDataNascimento`, filhos) — precisa ser bissexto pra
 * 29/fev não estourar pra 1º/março (`safeDateForYear` corrige contra o ano
 * REAL de destino, não este). Nunca aparece pro usuário: `anosCompletos`
 * derivado dele nunca é exibido pra esses dois `kind`s.
 */
const UNKNOWN_YEAR_PLACEHOLDER = 2000;

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
  ['conjuge', 'conjugeDataNascimento'],
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
      if (TERMINAL_MEMBER_SITUATION_STATUSES.includes(member.situacao)) continue;

      for (const [kind, field] of KIND_FIELDS) {
        const data = member[field];
        if (!(data instanceof Date)) continue;

        const { diasAte, anosCompletos, dia, mes } = computeNextOccurrence(hoje, data);
        if (diasAte > withinDays) continue;

        entries.push({
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          fotoUrl: member.fotoUrl,
          grau: member.grau,
          kind,
          data,
          dia,
          mes,
          anosCompletos,
          diasAte,
          conjugeNome: kind === 'conjuge' ? member.conjugeNome : null,
          filhoNome: null,
        });
      }

      // Fallback do próprio aniversário do Irmão sem ano conhecido — só
      // quando `dataNascimento` não existe; nunca sobrescreve a data
      // completa quando ela já foi informada. Mesmo padrão do fallback da
      // cônjuge logo abaixo.
      if (!member.dataNascimento && member.aniversarioDia && member.aniversarioMes) {
        const data = new Date(
          UNKNOWN_YEAR_PLACEHOLDER,
          member.aniversarioMes - 1,
          member.aniversarioDia,
        );
        const {
          diasAte,
          anosCompletos,
          dia: diaOcorrencia,
          mes: mesOcorrencia,
        } = computeNextOccurrence(hoje, data);
        if (diasAte <= withinDays) {
          entries.push({
            memberId: member.id,
            nomeCompleto: member.nomeCompleto,
            fotoUrl: member.fotoUrl,
            grau: member.grau,
            kind: 'nascimento',
            data,
            dia: diaOcorrencia,
            mes: mesOcorrencia,
            anosCompletos,
            diasAte,
            conjugeNome: null,
            filhoNome: null,
          });
        }
      }

      // Fallback do aniversário da cônjuge sem ano conhecido — só quando
      // `conjugeDataNascimento` (data completa, preenchida pelo próprio
      // Irmão) não existe; nunca sobrescreve a data completa quando ela já
      // foi informada.
      if (
        !member.conjugeDataNascimento &&
        member.conjugeAniversarioDia &&
        member.conjugeAniversarioMes
      ) {
        const data = new Date(
          UNKNOWN_YEAR_PLACEHOLDER,
          member.conjugeAniversarioMes - 1,
          member.conjugeAniversarioDia,
        );
        const {
          diasAte,
          anosCompletos,
          dia: diaOcorrencia,
          mes: mesOcorrencia,
        } = computeNextOccurrence(hoje, data);
        if (diasAte <= withinDays) {
          entries.push({
            memberId: member.id,
            nomeCompleto: member.nomeCompleto,
            fotoUrl: member.fotoUrl,
            grau: member.grau,
            kind: 'conjuge',
            data,
            dia: diaOcorrencia,
            mes: mesOcorrencia,
            anosCompletos,
            diasAte,
            conjugeNome: member.conjugeNome,
            filhoNome: null,
          });
        }
      }

      for (const filho of member.filhos ?? []) {
        const data = new Date(
          UNKNOWN_YEAR_PLACEHOLDER,
          filho.aniversarioMes - 1,
          filho.aniversarioDia,
        );
        const { diasAte, anosCompletos, dia, mes } = computeNextOccurrence(hoje, data);
        if (diasAte > withinDays) continue;

        entries.push({
          memberId: member.id,
          nomeCompleto: member.nomeCompleto,
          fotoUrl: member.fotoUrl,
          grau: member.grau,
          kind: 'filho',
          data,
          dia,
          mes,
          anosCompletos,
          diasAte,
          conjugeNome: null,
          filhoNome: filho.nome,
        });
      }
    }

    const LOW_PRIORITY_KINDS: AnniversaryKind[] = ['nascimento', 'conjuge', 'filho'];
    return entries.sort((a, b) => {
      if (a.diasAte !== b.diasAte) return a.diasAte - b.diasAte;
      const aLow = LOW_PRIORITY_KINDS.includes(a.kind);
      const bLow = LOW_PRIORITY_KINDS.includes(b.kind);
      if (aLow !== bLow) return aLow ? 1 : -1;
      return a.nomeCompleto.localeCompare(b.nomeCompleto);
    });
  }
}
