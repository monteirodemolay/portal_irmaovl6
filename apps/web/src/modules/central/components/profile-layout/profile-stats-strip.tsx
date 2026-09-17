import type { Honor, MemberTitle, PublicMemberProfileDTO } from '@vl6/domain';
import { getCurrentAssignment } from '../profile-shared';

/**
 * Tiras de estatísticas do topo da coluna central (mock-up "Perfil VL6") —
 * gestão atual, cargos registrados, honrarias e marcos históricos. Todos os
 * números vêm de dados já carregados pela página (nunca inventados); cada
 * tile só aparece se o número correspondente for maior que zero (gestão
 * atual é texto, não conta), e a tira inteira some se não sobrar nenhum
 * tile — nunca reserva o espaço vazio.
 */
export function ProfileStatsStrip({
  profile,
  memberTitles,
  honors,
}: {
  profile: PublicMemberProfileDTO;
  memberTitles: MemberTitle[];
  honors: Honor[];
}) {
  const current = getCurrentAssignment(profile.trajetoria);
  const trajetoria = profile.trajetoria;
  const cargosCount = trajetoria?.cargos.length ?? 0;
  const honrariasCount = honors.length + memberTitles.length;
  const marcosCount = trajetoria
    ? [trajetoria.dataIniciacao, trajetoria.dataElevacao, trajetoria.dataExaltacao].filter(Boolean)
        .length +
      trajetoria.cargos.length +
      trajetoria.comissoes.length +
      (trajetoria.encerramento ? 1 : 0)
    : 0;

  const tiles: { value: string; label: string }[] = [
    current?.gestaoNome ? { value: current.gestaoNome, label: 'Gestão atual' } : null,
    cargosCount > 0 ? { value: String(cargosCount), label: 'Cargos registrados' } : null,
    honrariasCount > 0 ? { value: String(honrariasCount), label: 'Honrarias e títulos' } : null,
    marcosCount > 0 ? { value: String(marcosCount), label: 'Marcos históricos' } : null,
  ].filter((tile): tile is { value: string; label: string } => tile !== null);

  if (tiles.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="border-border bg-surface rounded-2xl border p-4 shadow-sm">
          <p className="font-display truncate text-2xl font-semibold leading-none">{tile.value}</p>
          <p className="text-muted mt-2 text-[10px] font-bold uppercase tracking-wide">
            {tile.label}
          </p>
        </div>
      ))}
    </div>
  );
}
