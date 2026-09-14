import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface ImportedIrmaoBirthday {
  nomeCompleto: string;
  dia: number;
  mes: number;
  anos: number;
}

export interface ImportedSpouseBirthday {
  irmaoNome: string;
  conjugeNome: string;
  dia: number;
  mes: number;
}

export interface ImportedChildBirthday {
  irmaoNome: string;
  nome: string;
  dia: number;
  mes: number;
}

export interface ImportBirthdayDataInput {
  /** Data em que o relatório de origem foi emitido — base pra calcular o ano de nascimento do Irmão a partir de dia/mês/idade (ver `computeBirthYear`). */
  reportDate: Date;
  irmaos: ImportedIrmaoBirthday[];
  conjuges: ImportedSpouseBirthday[];
  filhos: ImportedChildBirthday[];
}

export type ImportBirthdayRowStatus = 'atualizado' | 'ja_preenchido' | 'nao_encontrado';

export interface ImportBirthdayResultRow {
  tipo: 'irmao' | 'conjuge' | 'filho';
  /** Nome de quem faz aniversário nesta linha. */
  nome: string;
  /** Nome do Irmão usado pra encontrar o cadastro (igual a `nome` quando `tipo === 'irmao'`). */
  irmaoBusca: string;
  status: ImportBirthdayRowStatus;
}

/**
 * A data de nascimento de um Irmão só é conhecida indiretamente no relatório
 * de origem (GLEG) como "dia/mês + idade completada na emissão do
 * relatório" — nunca o ano direto. Se o aniversário deste ano (`reportDate`)
 * já aconteceu (dia/mês <= data do relatório), a idade informada já reflete
 * o ano corrente; senão, reflete o aniversário do ano anterior.
 */
export function computeBirthYear(reportDate: Date, mes: number, dia: number, anos: number): number {
  const reportMonth = reportDate.getMonth() + 1;
  const reportDay = reportDate.getDate();
  const jaAconteceuEsteAno = mes < reportMonth || (mes === reportMonth && dia <= reportDay);
  return jaAconteceuEsteAno ? reportDate.getFullYear() - anos : reportDate.getFullYear() - anos - 1;
}

export interface ImportBirthdayDataDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Importação institucional única (não repetível/agendada) dos aniversários
 * de Irmãos, cônjuges e filhos a partir do relatório da GLEG — vincula pelo
 * nome (normalizado, sem acento/maiúscula) contra o cadastro já existente.
 * Nunca sobrescreve um dado já preenchido (Irmão já tem `dataNascimento`,
 * cônjuge já tem data completa ou fallback, filho já cadastrado por nome) —
 * cada linha "já preenchida" ou "sem cadastro correspondente" só aparece no
 * relatório de resultado, pro Administrador revisar manualmente os casos que
 * a importação não resolveu sozinha.
 */
export class ImportBirthdayDataUseCase {
  constructor(private readonly deps: ImportBirthdayDataDeps) {}

  async execute(
    ctx: AuthContext,
    input: ImportBirthdayDataInput,
  ): Promise<ImportBirthdayResultRow[]> {
    requirePermission(ctx, 'member:update');

    const { items } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 2000 },
    );

    const byNormalizedName = new Map<string, Member>();
    for (const member of items) {
      byNormalizedName.set(normalizeNameForSearch(member.nomeCompleto), member);
    }

    const dirty = new Set<string>();
    const results: ImportBirthdayResultRow[] = [];
    const now = this.deps.clock.now();

    for (const row of input.irmaos) {
      const member = byNormalizedName.get(normalizeNameForSearch(row.nomeCompleto));
      if (!member) {
        results.push({
          tipo: 'irmao',
          nome: row.nomeCompleto,
          irmaoBusca: row.nomeCompleto,
          status: 'nao_encontrado',
        });
        continue;
      }
      if (member.dataNascimento) {
        results.push({
          tipo: 'irmao',
          nome: row.nomeCompleto,
          irmaoBusca: row.nomeCompleto,
          status: 'ja_preenchido',
        });
        continue;
      }
      const ano = computeBirthYear(input.reportDate, row.mes, row.dia, row.anos);
      member.dataNascimento = new Date(ano, row.mes - 1, row.dia);
      dirty.add(member.id);
      results.push({
        tipo: 'irmao',
        nome: row.nomeCompleto,
        irmaoBusca: row.nomeCompleto,
        status: 'atualizado',
      });
    }

    for (const row of input.conjuges) {
      const member = byNormalizedName.get(normalizeNameForSearch(row.irmaoNome));
      if (!member) {
        results.push({
          tipo: 'conjuge',
          nome: row.conjugeNome,
          irmaoBusca: row.irmaoNome,
          status: 'nao_encontrado',
        });
        continue;
      }
      if (
        member.conjugeDataNascimento ||
        (member.conjugeAniversarioDia && member.conjugeAniversarioMes)
      ) {
        results.push({
          tipo: 'conjuge',
          nome: row.conjugeNome,
          irmaoBusca: row.irmaoNome,
          status: 'ja_preenchido',
        });
        continue;
      }
      member.conjugeNome = member.conjugeNome ?? row.conjugeNome;
      member.conjugeAniversarioDia = row.dia;
      member.conjugeAniversarioMes = row.mes;
      dirty.add(member.id);
      results.push({
        tipo: 'conjuge',
        nome: row.conjugeNome,
        irmaoBusca: row.irmaoNome,
        status: 'atualizado',
      });
    }

    for (const row of input.filhos) {
      const member = byNormalizedName.get(normalizeNameForSearch(row.irmaoNome));
      if (!member) {
        results.push({
          tipo: 'filho',
          nome: row.nome,
          irmaoBusca: row.irmaoNome,
          status: 'nao_encontrado',
        });
        continue;
      }
      const nomeNormalizado = normalizeNameForSearch(row.nome);
      const jaExiste = member.filhos.some(
        (filho) => normalizeNameForSearch(filho.nome) === nomeNormalizado,
      );
      if (jaExiste) {
        results.push({
          tipo: 'filho',
          nome: row.nome,
          irmaoBusca: row.irmaoNome,
          status: 'ja_preenchido',
        });
        continue;
      }
      member.filhos.push({
        id: this.deps.idGenerator.next(),
        nome: row.nome,
        aniversarioDia: row.dia,
        aniversarioMes: row.mes,
      });
      dirty.add(member.id);
      results.push({
        tipo: 'filho',
        nome: row.nome,
        irmaoBusca: row.irmaoNome,
        status: 'atualizado',
      });
    }

    for (const memberId of dirty) {
      const member = items.find((m) => m.id === memberId);
      if (!member) continue;
      await this.deps.memberRepository.update({ ...member, updatedAt: now, updatedBy: ctx.uid });
    }

    return results;
  }
}
