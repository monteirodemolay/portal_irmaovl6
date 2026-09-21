import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import {
  computeBirthYear,
  type ImportedChildBirthday,
  type ImportedIrmaoBirthday,
  type ImportedSpouseBirthday,
} from './import-birthday-data.use-case';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface VerifyBirthdayDataInput {
  /** Mesma data do relatório-fonte usada em `ImportBirthdayDataUseCase.execute` — precisa ser idêntica pra `computeBirthYear` recalcular o mesmo ano esperado. */
  reportDate: Date;
  irmaos: ImportedIrmaoBirthday[];
  conjuges: ImportedSpouseBirthday[];
  filhos: ImportedChildBirthday[];
}

export interface VerifyBirthdayMismatch {
  tipo: 'irmao' | 'conjuge' | 'filho';
  memberId: string;
  irmaoNomeCompleto: string;
  /** Nome de quem a data pertence — igual a `irmaoNomeCompleto` quando `tipo === 'irmao'`. */
  nome: string;
  diaEsperado: number;
  mesEsperado: number;
  diaAtual: number | null;
  mesAtual: number | null;
  corrigido: boolean;
}

/**
 * `ImportBirthdayDataUseCase` só PREENCHE campo em branco — nunca corrige um
 * valor já existente, mesmo que esteja errado (regra deliberada: "nunca
 * sobrescreve um dado já preenchido"). Isso significa que uma data gravada
 * errada uma vez (edição manual equivocada, importação anterior com dado
 * de origem diferente etc.) nunca se autocorrige sozinha. Este use case
 * confere dia/mês de cada data cadastral contra o mesmo relatório-fonte
 * (GLEG) usado na importação original e CORRIGE quando não bate — pedido
 * explícito do Administrador depois de encontrar um aniversário exibido
 * com um dia a menos do esperado: "não podemos ter erros" em data.
 *
 * Nunca inventa ano: pro próprio Irmão, só entra em ação quando dia OU mês
 * destoam do relatório, e aí recalcula o ano esperado do mesmo jeito que a
 * importação original (`computeBirthYear`, a partir de `dia`/`mes`/`anos`
 * do relatório — mesmo `reportDate`, pra bater exatamente com o ano já
 * gravado quando dia/mês já estavam certos). Pra cônjuge/filhos,
 * nunca mexe no ano (a fonte nunca traz ano pra eles) — só corrige
 * `conjugeAniversarioDia`/`Mes` (ou o dia/mês de `conjugeDataNascimento`,
 * quando só ela estiver preenchida) e `MemberChild.aniversarioDia`/`Mes`.
 * Quem não bate com nenhum cadastro (`nao_encontrado`, nome sem correspondência)
 * ou não tem a data pra comparar ainda (`sem_dado`, nunca preenchida —
 * `ImportBirthdayDataUseCase` cobre esse caso, não este) fica de fora do
 * relatório de mismatches.
 */
export interface VerifyBirthdayDataDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
}

export class VerifyBirthdayDataUseCase {
  constructor(private readonly deps: VerifyBirthdayDataDeps) {}

  async execute(
    ctx: AuthContext,
    input: VerifyBirthdayDataInput,
  ): Promise<Result<VerifyBirthdayMismatch[]>> {
    requirePermission(ctx, 'member:manage');

    const { items } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 2000 },
    );
    const byNormalizedName = new Map<string, Member>();
    for (const member of items) {
      byNormalizedName.set(normalizeNameForSearch(member.nomeCompleto), member);
    }

    const now = this.deps.clock.now();
    const mismatches: VerifyBirthdayMismatch[] = [];
    const dirty = new Map<string, Member>();

    for (const row of input.irmaos) {
      const member =
        dirty.get(normalizeNameForSearch(row.nomeCompleto)) ??
        byNormalizedName.get(normalizeNameForSearch(row.nomeCompleto));
      if (!member || !member.dataNascimento) continue;

      const diaAtual = member.dataNascimento.getDate();
      const mesAtual = member.dataNascimento.getMonth() + 1;
      if (diaAtual === row.dia && mesAtual === row.mes) continue;

      const anoEsperado = computeBirthYear(input.reportDate, row.mes, row.dia, row.anos);
      const corrigido: Member = {
        ...member,
        dataNascimento: new Date(anoEsperado, row.mes - 1, row.dia),
      };
      dirty.set(normalizeNameForSearch(member.nomeCompleto), corrigido);
      mismatches.push({
        tipo: 'irmao',
        memberId: member.id,
        irmaoNomeCompleto: member.nomeCompleto,
        nome: member.nomeCompleto,
        diaEsperado: row.dia,
        mesEsperado: row.mes,
        diaAtual,
        mesAtual,
        corrigido: true,
      });
    }

    for (const row of input.conjuges) {
      const member =
        dirty.get(normalizeNameForSearch(row.irmaoNome)) ??
        byNormalizedName.get(normalizeNameForSearch(row.irmaoNome));
      if (!member) continue;

      const diaAtual = member.conjugeDataNascimento
        ? member.conjugeDataNascimento.getDate()
        : member.conjugeAniversarioDia;
      const mesAtual = member.conjugeDataNascimento
        ? member.conjugeDataNascimento.getMonth() + 1
        : member.conjugeAniversarioMes;
      if (diaAtual === null || mesAtual === null) continue;
      if (diaAtual === row.dia && mesAtual === row.mes) continue;

      const corrigido: Member = member.conjugeDataNascimento
        ? {
            ...member,
            conjugeDataNascimento: new Date(
              member.conjugeDataNascimento.getFullYear(),
              row.mes - 1,
              row.dia,
            ),
          }
        : { ...member, conjugeAniversarioDia: row.dia, conjugeAniversarioMes: row.mes };
      dirty.set(normalizeNameForSearch(member.nomeCompleto), corrigido);
      mismatches.push({
        tipo: 'conjuge',
        memberId: member.id,
        irmaoNomeCompleto: member.nomeCompleto,
        nome: row.conjugeNome,
        diaEsperado: row.dia,
        mesEsperado: row.mes,
        diaAtual,
        mesAtual,
        corrigido: true,
      });
    }

    for (const row of input.filhos) {
      const member =
        dirty.get(normalizeNameForSearch(row.irmaoNome)) ??
        byNormalizedName.get(normalizeNameForSearch(row.irmaoNome));
      if (!member) continue;

      const nomeFilhoNormalizado = normalizeNameForSearch(row.nome);
      const index = member.filhos.findIndex(
        (filho) => normalizeNameForSearch(filho.nome) === nomeFilhoNormalizado,
      );
      if (index === -1) continue;
      const filho = member.filhos[index]!;
      if (filho.aniversarioDia === row.dia && filho.aniversarioMes === row.mes) continue;

      const filhosCorrigidos = member.filhos.map((f, i) =>
        i === index ? { ...f, aniversarioDia: row.dia, aniversarioMes: row.mes } : f,
      );
      const corrigido: Member = { ...member, filhos: filhosCorrigidos };
      dirty.set(normalizeNameForSearch(member.nomeCompleto), corrigido);
      mismatches.push({
        tipo: 'filho',
        memberId: member.id,
        irmaoNomeCompleto: member.nomeCompleto,
        nome: row.nome,
        diaEsperado: row.dia,
        mesEsperado: row.mes,
        diaAtual: filho.aniversarioDia,
        mesAtual: filho.aniversarioMes,
        corrigido: true,
      });
    }

    for (const member of dirty.values()) {
      await this.deps.memberRepository.update({ ...member, updatedAt: now, updatedBy: ctx.uid });
    }

    return ok(mismatches);
  }
}
