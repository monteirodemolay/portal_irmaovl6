import Link from 'next/link';
import type { CeremonyMatesGroup } from '@vl6/domain';
import { Users } from '@vl6/ui';
import { MemberAvatar } from './member-avatar';
import { Panel } from './institutional-panel';

const KIND_LABEL: Record<CeremonyMatesGroup['tipo'], string> = {
  iniciacao: 'Iniciação',
  elevacao: 'Elevação',
  exaltacao: 'Exaltação',
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

/**
 * "Irmãos Gêmeos" — colegas que passaram pela mesma sessão de iniciação/
 * elevação/exaltação (mesmo `ArchiveItem` de cerimônia, ver
 * `getCeremonyMates`). Mesma peça `Panel`/`MemberAvatar` já usada no
 * resto do perfil institucional; some por completo quando `groups` vem
 * vazio (nenhuma cerimônia teve mais de um participante), nunca mostra um
 * card vazio.
 */
export function CeremonyMatesPanel({ groups }: { groups: CeremonyMatesGroup[] }) {
  if (groups.length === 0) return null;

  return (
    <Panel kicker="MEMÓRIA" title="Irmãos Gêmeos" icon={Users}>
      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.tipo} className="flex flex-col gap-2.5">
            <p className="text-muted text-xs">
              {KIND_LABEL[group.tipo]} em{' '}
              <span className="font-medium">{formatDate(group.data)}</span> — mesma turma:
            </p>
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
