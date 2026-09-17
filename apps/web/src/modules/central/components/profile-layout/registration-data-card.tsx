import type { PublicMemberProfileDTO } from '@vl6/domain';
import { MEMBER_SITUATION_STATUS_LABELS } from '@vl6/shared';
import { formatDate, Panel } from '../profile-shared';

/**
 * "Dados cadastrais" — consolidação tabular dos campos institucionais do
 * Irmão (mock-up "Perfil VL6", `.data-grid`). Cada campo só aparece se
 * tiver valor (nunca "não informado"); o card inteiro sempre existe porque
 * `nomeCompleto` é obrigatório. Serve tanto o Irmão ativo quanto o In
 * Memoriam — a diferença é só "Passagem ao Oriente Eterno", que só entra na
 * lista quando `profile.dataFalecimento` existe.
 *
 * CIM, Potência, Loja, Oriente e Profissão NÃO entram aqui — já aparecem no
 * cabeçalho e no card de identidade (`ProfileHero`/`ProfileIdentityRail`,
 * inclusive "Perfil em resumo"). Empilhado no celular, repetir esses campos
 * lia como a mesma informação três vezes seguidas.
 */
export function RegistrationDataCard({ profile }: { profile: PublicMemberProfileDTO }) {
  const isInMemoriam = profile.situacao === 'falecido';

  const fields: { label: string; value: string }[] = [
    { label: 'Nome completo', value: profile.nomeCompleto },
    { label: 'Situação maçônica', value: MEMBER_SITUATION_STATUS_LABELS[profile.situacao] },
    isInMemoriam && profile.dataFalecimento
      ? { label: 'Passagem ao Oriente Eterno', value: formatDate(profile.dataFalecimento) }
      : null,
  ].filter((field): field is { label: string; value: string } => field !== null);

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
