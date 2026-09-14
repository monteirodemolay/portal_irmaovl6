import Link from 'next/link';
import type { CeremonyMatesGroup } from '@vl6/domain';
import { Users } from '@vl6/ui';
import { MemberAvatar } from './member-avatar';
import { Panel } from './institutional-panel';

/**
 * "Irmãos Gêmeos" é termo só da Iniciação (achado do Administrador: "Somente
 * é irmão gêmeo, na iniciação. Nas outras não é!") — Elevação/Exaltação no
 * mesmo dia continuam vinculadas e exibidas aqui, só sem esse termo.
 */
const GROUP_TEXT: Record<CeremonyMatesGroup['tipo'], (date: string) => string> = {
  iniciacao: (date) => `Iniciado(s) junto em ${date} — seu(s) Irmão(s) Gêmeo(s):`,
  elevacao: (date) => `Elevado(s) junto em ${date}:`,
  exaltacao: (date) => `Exaltado(s) junto em ${date}:`,
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

/**
 * Colegas que passaram pela mesma sessão de iniciação/elevação/exaltação
 * (mesmo `ArchiveItem` de cerimônia, ver `getCeremonyMates`). O título
 * "Irmãos Gêmeos" só aparece quando há grupo de Iniciação — Elevação/
 * Exaltação no mesmo dia aparecem vinculadas, mas com outro título (esse
 * termo é exclusivo da Iniciação). Mesma peça `Panel`/`MemberAvatar` já
 * usada no resto do perfil institucional; some por completo quando
 * `groups` vem vazio (nenhuma cerimônia teve mais de um participante),
 * nunca mostra um card vazio.
 */
export function CeremonyMatesPanel({ groups }: { groups: CeremonyMatesGroup[] }) {
  if (groups.length === 0) return null;

  const title = groups.some((g) => g.tipo === 'iniciacao')
    ? 'Irmãos Gêmeos'
    : 'Colegas de Cerimônia';

  return (
    <Panel kicker="MEMÓRIA" title={title} icon={Users}>
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.tipo} className="flex flex-col gap-2.5">
            <p className="text-muted text-xs">{GROUP_TEXT[group.tipo](formatDate(group.data))}</p>
            <ul className="flex flex-wrap gap-2">
              {group.colegas.map((colega) => (
                <li key={colega.memberId}>
                  <Link
                    href={`/irmaos/${colega.memberId}`}
                    className="border-border bg-background hover:border-primary hover:text-primary flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors"
                  >
                    <MemberAvatar
                      fotoUrl={colega.fotoUrl}
                      nome={colega.nomeCompleto}
                      className="h-6 w-6 shrink-0"
                      disablePreview
                    />
                    <span className="font-medium">{colega.nomeCompleto}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  );
}
