import Link from 'next/link';
import { HISTORICAL_BOARD_TERMS_VL6 } from '@vl6/domain';
import { ArrowLeft } from '@vl6/ui';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { ImportHistoricalBoardTermsForm } from '@/modules/governance/components/import-historical-board-terms-form';

/**
 * Importação única da nominata histórica (1947–2026) fornecida pela
 * Secretaria — cria as Gestões, os Irmãos ainda não cadastrados (como
 * "Ativo", pra revisão posterior) e o histórico de Venerável Mestre/1º/2º
 * Vigilante de cada uma. Seguro rodar várias vezes: nunca duplica gestão
 * nem Irmão já existente, só complementa fotos que ainda faltavam.
 */
export default async function ImportHistoricalBoardTermsPage() {
  await requirePagePermission('boardTerm:manage');

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
    </div>
  );
}
