import { normalizeNameForSearch } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import type { Member } from '../entities/member.entity';
import type { IMemberRepository } from '../repositories/member.repository';

export interface ConsolidatedReportFamiliar {
  nome: string;
  dia: number;
  mes: number;
}

export interface ConsolidatedReportRow {
  nomeCompleto: string;
  /** Só dia/mês — o relatório-base não traz o ano do próprio Irmão. */
  aniversarioDia: number | null;
  aniversarioMes: number | null;
  dataIniciacao: Date | null;
  conjugeNome: string | null;
  /** Só dia/mês — mesmo motivo de `aniversarioDia` acima. */
  conjugeAniversarioDia: number | null;
  conjugeAniversarioMes: number | null;
  dataCasamento: Date | null;
  familiares: ConsolidatedReportFamiliar[];
}

export type ImportConsolidatedReportRowStatus = 'atualizado' | 'sem_alteracao' | 'nao_encontrado';

export interface ImportConsolidatedReportResultRow {
  nomeCompleto: string;
  status: ImportConsolidatedReportRowStatus;
  /** Descrição legível de cada campo tocado — vazio quando `status` não é `'atualizado'`. */
  camposAtualizados: string[];
}

export interface ImportConsolidatedReportDeps {
  memberRepository: IMemberRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Importação institucional única (não repetível/agendada) do "Relatório
 * Consolidado de Datas" — planilha curada pelo Administrador que reúne, por
 * Irmão: aniversário próprio (dia/mês), data de iniciação, cônjuge (nome +
 * aniversário dia/mês), data de casamento e aniversário de familiares
 * (dia/mês). Vincula pelo nome (normalizado, sem acento/maiúscula) contra o
 * cadastro já existente — nunca cria um Irmão novo, uma linha sem cadastro
 * correspondente só aparece no relatório de resultado pra revisão manual.
 *
 * Nunca sobrescreve um dado já preenchido: cada campo só é gravado quando o
 * campo correspondente do cadastro está vazio (ver cada bloco abaixo). Os
 * familiares recebem o mesmo tratamento de `filhos` (Member.filhos) — dia/
 * mês sem ano, deduplicados por nome, e um familiar com o mesmo nome
 * (normalizado) do próprio Irmão é ignorado (achado do relatório-base: uma
 * linha da planilha listava o próprio Irmão dentro da própria coluna de
 * familiares).
 */
export class ImportConsolidatedReportUseCase {
  constructor(private readonly deps: ImportConsolidatedReportDeps) {}

  async execute(
    ctx: AuthContext,
    rows: ConsolidatedReportRow[],
  ): Promise<ImportConsolidatedReportResultRow[]> {
    requirePermission(ctx, 'member:update');

    const { items } = await this.deps.memberRepository.search(
      { tenantId: ctx.tenantId },
      { limit: 2000 },
    );
    const byNormalizedName = new Map<string, Member>();
    for (const member of items) {
      byNormalizedName.set(normalizeNameForSearch(member.nomeCompleto), member);
    }

    const now = this.deps.clock.now();
    const results: ImportConsolidatedReportResultRow[] = [];

    for (const row of rows) {
      const member = byNormalizedName.get(normalizeNameForSearch(row.nomeCompleto));
      if (!member) {
        results.push({
          nomeCompleto: row.nomeCompleto,
          status: 'nao_encontrado',
          camposAtualizados: [],
        });
        continue;
      }

      const campos: string[] = [];
      let mutated: Member = member;

      if (row.dataIniciacao && !mutated.dataIniciacao) {
        mutated = { ...mutated, dataIniciacao: row.dataIniciacao };
        campos.push('data de iniciação');
      }

      if (
        row.aniversarioDia &&
        row.aniversarioMes &&
        !mutated.dataNascimento &&
        !mutated.aniversarioDia
      ) {
        mutated = {
          ...mutated,
          aniversarioDia: row.aniversarioDia,
          aniversarioMes: row.aniversarioMes,
        };
        campos.push('aniversário do Irmão');
      }

      if (row.conjugeNome && !mutated.conjugeNome) {
        mutated = { ...mutated, conjugeNome: row.conjugeNome };
        campos.push('nome da cônjuge');
      }

      if (
        row.conjugeAniversarioDia &&
        row.conjugeAniversarioMes &&
        !mutated.conjugeDataNascimento &&
        !mutated.conjugeAniversarioDia
      ) {
        mutated = {
          ...mutated,
          conjugeAniversarioDia: row.conjugeAniversarioDia,
          conjugeAniversarioMes: row.conjugeAniversarioMes,
        };
        campos.push('aniversário da cônjuge');
      }

      if (row.dataCasamento && !mutated.dataCasamento) {
        mutated = { ...mutated, dataCasamento: row.dataCasamento };
        campos.push('data de casamento');
      }

      const nomeIrmaoNormalizado = normalizeNameForSearch(row.nomeCompleto);
      const filhosAtuais = [...mutated.filhos];
      let familiaresAdicionados = 0;
      for (const familiar of row.familiares) {
        const nomeFamiliarNormalizado = normalizeNameForSearch(familiar.nome);
        if (nomeFamiliarNormalizado === nomeIrmaoNormalizado) continue;
        const jaExiste = filhosAtuais.some(
          (f) => normalizeNameForSearch(f.nome) === nomeFamiliarNormalizado,
        );
        if (jaExiste) continue;
        filhosAtuais.push({
          id: this.deps.idGenerator.next(),
          nome: familiar.nome,
          aniversarioDia: familiar.dia,
          aniversarioMes: familiar.mes,
        });
        familiaresAdicionados++;
      }
      if (familiaresAdicionados > 0) {
        mutated = { ...mutated, filhos: filhosAtuais };
        campos.push(`${familiaresAdicionados} familiar(es)`);
      }

      if (campos.length === 0) {
        results.push({
          nomeCompleto: row.nomeCompleto,
          status: 'sem_alteracao',
          camposAtualizados: [],
        });
        continue;
      }

      await this.deps.memberRepository.update({ ...mutated, updatedAt: now, updatedBy: ctx.uid });
      results.push({
        nomeCompleto: row.nomeCompleto,
        status: 'atualizado',
        camposAtualizados: campos,
      });
    }

    return results;
  }
}
