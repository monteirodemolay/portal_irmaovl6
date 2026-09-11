'use client';

import { useState, useTransition } from 'react';
import { Building2, Users } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import {
  findColleaguesByEmployerAction,
  type ColleagueAtEmployer,
} from '../../actions/central-actions';

/**
 * "Outros Irmãos na mesma empresa" — mostrado logo abaixo de "Empresa
 * atual" (`CompanyCard`). Pedido explícito: quem só cadastra a empresa
 * atual pra contato (sem divulgar nada em "Empresas e negócios") ainda
 * precisa ter como achar colegas de trabalho já cadastrados no Portal.
 * Busca sob demanda (botão), nunca automática ao digitar — evita disparar
 * a Server Action a cada tecla.
 */
export function ColleaguesAtEmployer({ empresaAtual }: { empresaAtual: string | null }) {
  const [query, setQuery] = useState(empresaAtual ?? '');
  const [results, setResults] = useState<ColleagueAtEmployer[] | null>(null);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSearch() {
    const termo = query.trim();
    if (termo.length < 3) return;
    startTransition(async () => {
      const found = await findColleaguesByEmployerAction(termo);
      setResults(found);
      setSearched(true);
    });
  }

  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-2xl border p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Users size={16} className="text-accent" strokeWidth={1.75} />
        <p className="text-sm font-semibold">Colegas na mesma empresa</p>
      </div>
      <p className="text-muted text-xs leading-relaxed">
        Digite o nome de uma empresa (a sua atual, ou outra) e veja se algum Irmão já cadastrou o
        mesmo lugar — no campo "Empresa atual" ou em "Empresas e negócios".
      </p>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSearch();
            }
          }}
          placeholder="Nome da empresa (mínimo 3 letras)"
          className="border-border bg-background focus:border-primary flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isPending || query.trim().length < 3}
          className="border-border bg-background hover:border-primary hover:text-primary shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Buscando…' : 'Buscar'}
        </button>
      </div>

      {searched && !isPending && (
        <div className="flex flex-col gap-2">
          {results && results.length > 0 ? (
            results.map((colleague) => (
              <a
                key={colleague.memberId}
                href={`/irmaos/${colleague.memberId}`}
                className="border-border bg-background hover:border-primary flex items-center gap-2.5 rounded-lg border p-2.5 text-sm transition-colors"
              >
                <MemberAvatar
                  fotoUrl={colleague.fotoUrl}
                  nome={colleague.nomeCompleto}
                  className="h-8 w-8 shrink-0"
                  disablePreview
                />
                <span className="truncate font-medium">{colleague.nomeCompleto}</span>
              </a>
            ))
          ) : (
            <p className="text-muted flex items-center gap-2 text-xs">
              <Building2 size={13} strokeWidth={1.75} />
              Nenhum outro Irmão com essa empresa cadastrada ainda.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
