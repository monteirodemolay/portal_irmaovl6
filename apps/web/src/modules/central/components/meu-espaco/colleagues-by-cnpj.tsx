'use client';

import { useEffect, useState } from 'react';
import { Users } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import {
  findColleaguesByCnpjAction,
  type ColleagueByCnpjResult,
} from '../../actions/central-actions';

/**
 * "Outros Irmãos nesta empresa" — automático a partir do CNPJ do próprio
 * card, sem busca manual (substitui o antigo `ColleaguesAtEmployer`, que
 * exigia digitar o nome da empresa de novo e clicar em "Buscar"). Dispara
 * sozinho via `useEffect` sempre que o CNPJ do card chega a 14 dígitos —
 * cobre tanto o card recém-preenchido quanto o já salvo ao abrir a aba.
 */
export function ColleaguesByCnpj({ cnpj }: { cnpj: string | null }) {
  const [colleagues, setColleagues] = useState<ColleagueByCnpjResult[] | null>(null);
  const digits = cnpj?.replace(/\D/g, '') ?? '';

  useEffect(() => {
    if (digits.length !== 14) {
      setColleagues(null);
      return;
    }
    let cancelled = false;
    findColleaguesByCnpjAction(digits).then((found) => {
      if (!cancelled) setColleagues(found);
    });
    return () => {
      cancelled = true;
    };
  }, [digits]);

  if (!colleagues || colleagues.length === 0) return null;

  return (
    <div className="border-border flex flex-col gap-2 border-t pt-4">
      <span className="text-muted flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <Users size={13} strokeWidth={1.75} className="text-accent" />
        Outros Irmãos nesta empresa
      </span>
      <div className="flex flex-col gap-2">
        {colleagues.map((colleague) => (
          <a
            key={colleague.memberId}
            href={`/irmaos/${colleague.memberId}`}
            className="border-border bg-surface hover:border-primary flex items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors"
          >
            <MemberAvatar
              fotoUrl={colleague.fotoUrl}
              nome={colleague.nomeCompleto}
              className="h-8 w-8 shrink-0"
              disablePreview
            />
            <span className="truncate font-medium">{colleague.nomeCompleto}</span>
            {colleague.cargo && (
              <span className="text-muted ml-auto shrink-0 truncate text-xs">
                {colleague.cargo}
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
