import type { PublicMemberProfileDTO } from '@vl6/domain';
import { formatDate, formatDayMonth, Panel } from '../profile-shared';

/**
 * "Dados cadastrais" — consolidação tabular dos campos institucionais do
 * Irmão (mock-up "Perfil VL6", `.data-grid`). Cada campo só aparece se
 * tiver valor (nunca "não informado"). Serve tanto o Irmão ativo quanto o In
 * Memoriam — a diferença é só "Passagem ao Oriente Eterno", que só entra na
 * lista quando `profile.dataFalecimento` existe.
 *
 * Nome completo e Situação maçônica NÃO entram aqui — já aparecem na faixa
 * de identificação do topo (`ProfileHero`, H1 + selo de status); CIM,
 * Potência, Loja, Oriente e Profissão também ficam de fora, pelo mesmo
 * motivo, só que no card de identidade (`ProfileIdentityRail`, "Perfil em
 * resumo"). Empilhado no celular, repetir esses campos lia como a mesma
 * informação duas ou três vezes seguidas (pedido do Administrador).
 */
export function RegistrationDataCard({ profile }: { profile: PublicMemberProfileDTO }) {
  const isInMemoriam = profile.situacao === 'falecido';
  const conjuge = profile.informacoesPessoais?.conjuge ?? null;

  const fields: { label: string; value: string }[] = [
    isInMemoriam && profile.dataFalecimento
      ? { label: 'Passagem ao Oriente Eterno', value: formatDate(profile.dataFalecimento) }
      : null,
    conjuge?.nome ? { label: 'Cônjuge', value: conjuge.nome } : null,
    conjuge?.diaNascimento && conjuge.mesNascimento
      ? {
          label: 'Aniversário da cônjuge',
          value: formatDayMonth(conjuge.diaNascimento, conjuge.mesNascimento),
        }
      : null,
  ].filter((field): field is { label: string; value: string } => field !== null);

  if (fields.length === 0) return null;

  return (
    <Panel id="dados" kicker="INFORMAÇÕES CONSOLIDADAS" title="Dados cadastrais">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className="border-border/70 border-b border-dashed pb-3 last:border-0"
          >
            <p className="text-muted text-[10px] font-bold uppercase tracking-wide">
              {field.label}
            </p>
            <p className="mt-1 text-sm font-semibold">{field.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
