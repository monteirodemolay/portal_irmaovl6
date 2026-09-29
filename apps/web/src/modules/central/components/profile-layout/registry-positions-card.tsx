import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { getBoardPositionLabel } from '@vl6/shared';
import { Landmark } from '@vl6/ui';
import { formatCompactDate, Panel } from '../profile-shared';

/**
 * "Cargos e funções" — subcard do grupo "Registros maçônicos" (mock-up
 * "Perfil VL6"), grade de tiles com cada cargo de Diretoria e comissão já
 * registrados (mesmos dados de `profile.trajetoria`, já carregados pela
 * página — sem repetir nenhuma busca). O cargo/comissão em curso vem
 * primeiro. Complementa, sem duplicar, a linha do tempo "Caminho na Loja" da
 * coluna de linha do tempo: aqui é uma visão tabular rápida, lá é a
 * sequência cronológica completa.
 */
export function RegistryPositionsCard({ profile }: { profile: PublicMemberProfileDTO }) {
  const trajetoria = profile.trajetoria;
  const entries = [
    ...(trajetoria?.cargos.map((cargo) => ({
      titulo: getBoardPositionLabel(cargo.cargo),
      gestaoId: cargo.gestaoId,
      gestaoNome: cargo.gestaoNome,
      dataInicio: cargo.dataInicio,
      dataFim: cargo.dataFim,
    })) ?? []),
    ...(trajetoria?.comissoes.map((comissao) => ({
      titulo: comissao.nome,
      gestaoId: comissao.gestaoId,
      gestaoNome: comissao.gestaoNome,
      dataInicio: comissao.dataInicio,
      dataFim: comissao.dataFim,
    })) ?? []),
  ].sort((a, b) => {
    // Em curso (`dataFim` nulo) primeiro, depois do mais recente ao mais antigo.
    if (!a.dataFim && b.dataFim) return -1;
    if (a.dataFim && !b.dataFim) return 1;
    return b.dataInicio.getTime() - a.dataInicio.getTime();
  });

  if (entries.length === 0) return null;

  return (
    <Panel id="cargos" kicker="CARGOS" title="Cargos e Funções" icon={Landmark} compact>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.map((entry, index) => (
          <li key={`${entry.titulo}-${index}`}>
            <Link
              href={`/acervo/gestoes/${entry.gestaoId}`}
              className="border-border bg-background hover:border-accent block rounded-xl border p-3.5 transition-colors"
            >
              <p className="text-sm font-semibold">{entry.titulo}</p>
              <p className="text-muted mt-1 text-xs">
                Gestão {entry.gestaoNome} · {formatCompactDate(entry.dataInicio)}
                {entry.dataFim ? ` até ${formatCompactDate(entry.dataFim)}` : ' · em curso'}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
