import Link from 'next/link';
import { createServerContainer } from '@vl6/infra';
import { HISTORICAL_BOARD_TERMS_VL6 } from '@vl6/domain';
import { BOARD_POSITION_LABELS } from '@vl6/shared';
import { ArrowLeft } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { DedupeMemberPositionHistoryButton } from '@/modules/governance/components/dedupe-member-position-history-button';
import { BackfillMestreInstaladoTitlesButton } from '@/modules/governance/components/backfill-mestre-instalado-titles-button';
import { ImportHistoricalBoardTermsForm } from '@/modules/governance/components/import-historical-board-terms-form';

// Margem extra pro Vercel — em lotes com fotos grandes, o upload pro Blob
// Storage mais a importação (agora paralelizada por fase no use case) podem
// passar do teto padrão de execução.
export const maxDuration = 60;

/**
 * Importação única da nominata histórica (1947–2026) fornecida pela
 * Secretaria — cria as Gestões, os Irmãos ainda não cadastrados (como
 * "Ativo", pra revisão posterior) e o histórico de Venerável Mestre/1º/2º
 * Vigilante de cada uma. Seguro rodar várias vezes: nunca duplica gestão
 * nem Irmão já existente, só complementa fotos que ainda faltavam.
 */
export default async function ImportHistoricalBoardTermsPage() {
  const session = await requirePagePermission('boardTerm:manage');

  const container = createServerContainer();
  const auditResult = await container.useCases.auditBoardTermCoverage.execute(session.authContext);
  const audit = auditResult.ok ? auditResult.value : null;

  const totalGestoes = HISTORICAL_BOARD_TERMS_VL6.length;
  const primeiraGestao = HISTORICAL_BOARD_TERMS_VL6[0]!;
  const ultimaGestao = HISTORICAL_BOARD_TERMS_VL6[HISTORICAL_BOARD_TERMS_VL6.length - 1]!;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/pessoas/gestoes"
        className="text-muted hover:text-accent flex w-fit items-center gap-1.5 text-sm"
      >
        <ArrowLeft size={16} />
        Gestões
      </Link>

      <div>
        <h1 className="font-display text-2xl font-semibold">Importar Nominata Histórica</h1>
        <p className="text-muted mt-1 text-sm">
          {totalGestoes} gestões, de &quot;{primeiraGestao.nome}&quot; a &quot;{ultimaGestao.nome}
          &quot; — Venerável Mestre, 1º e 2º Vigilante de cada uma, transcritas do histórico enviado
          pela Secretaria. A Gestão 2026/2027 já está cadastrada e não faz parte desta lista.
        </p>
      </div>

      <div className="border-border bg-background rounded-xl border p-4 text-sm">
        <p className="font-semibold">Antes de importar:</p>
        <ul className="text-muted mt-2 flex list-disc flex-col gap-1 pl-4">
          <li>
            Irmãos que já têm cadastro são reconhecidos pelo nome — não duplica ninguém, só registra
            o cargo histórico.
          </li>
          <li>
            Quem ainda não tem cadastro é criado com situação &quot;Ativo&quot; — revise depois quem
            já faleceu em Pessoas &amp; Loja.
          </li>
          <li>Pode importar as fotos aos poucos, em quantas vezes precisar.</li>
        </ul>
      </div>

      <ImportHistoricalBoardTermsForm />

      <div className="border-border bg-background rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">Manutenção</p>
        <p className="text-muted mt-1 text-xs">
          Se a importação foi interrompida no meio (por exemplo, por causa de um tempo de execução
          esgotado) e algum vínculo de cargo ficou duplicado, use o botão abaixo pra limpar — não
          duplica nada, só remove as cópias extras mantendo a mais antiga.
        </p>
        <div className="mt-3">
          <DedupeMemberPositionHistoryButton />
        </div>
      </div>

      <div className="border-border bg-background rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">Mestre Instalado automático</p>
        <p className="text-muted mt-1 text-xs">
          Todo Irmão que exerce o cargo de Venerável Mestre vira Mestre Instalado automaticamente no
          dia seguinte ao fim da gestão no cargo — dali em diante, sem precisar de lançamento
          manual. O botão abaixo concede o título, retroativamente, a quem já deixou o cargo antes
          dessa regra existir.
        </p>
        <div className="mt-3">
          <BackfillMestreInstaladoTitlesButton />
        </div>
      </div>

      {audit && (
        <div className="border-border bg-background rounded-xl border p-4">
          <p className="text-sm font-semibold">Auditoria de cobertura das Gestões</p>
          <p className="text-muted mt-1 text-xs">
            {audit.totalGestoes} Gestões cadastradas no total.
          </p>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Gestões sem Venerável/Vigilantes completos
            </p>
            {audit.gestoesSemCargo.length === 0 ? (
              <p className="text-muted mt-1 text-xs">
                Nenhuma — todas as Gestões têm Venerável Mestre, 1º e 2º Vigilante registrados.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {audit.gestoesSemCargo.map((gap) => (
                  <li key={gap.gestaoId} className="text-xs">
                    <span className="font-medium">{gap.gestaoNome}</span>
                    <span className="text-muted">
                      {' '}
                      — falta{gap.cargosFaltando.length > 1 ? 'm' : ''}:{' '}
                      {gap.cargosFaltando.map((cargo) => BOARD_POSITION_LABELS[cargo]).join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide">
              Cargos duplicados dentro da mesma Gestão
            </p>
            <p className="text-muted mt-1 text-xs">
              Mesmo Irmão ocupando o mesmo cargo mais de uma vez na mesma Gestão — ocupar o mesmo
              cargo em Gestões diferentes ao longo dos anos é normal e não aparece aqui.
            </p>
            {audit.cargosDuplicados.length === 0 ? (
              <p className="text-muted mt-1 text-xs">Nenhum encontrado.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {audit.cargosDuplicados.map((dup) => (
                  <li key={`${dup.gestaoId}-${dup.cargo}-${dup.memberId}`} className="text-xs">
                    <span className="font-medium">{dup.nomeCompleto}</span>
                    <span className="text-muted">
                      {' '}
                      —{' '}
                      {BOARD_POSITION_LABELS[dup.cargo as keyof typeof BOARD_POSITION_LABELS] ??
                        dup.cargo}{' '}
                      na {dup.gestaoNome} ({dup.ocorrencias}x)
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
