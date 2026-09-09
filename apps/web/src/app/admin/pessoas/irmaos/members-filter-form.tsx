'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BOARD_POSITION_KEYS,
  BOARD_POSITION_LABELS,
  MEMBER_DEGREES,
  MEMBER_SITUATION_STATUSES,
  MEMBER_SITUATION_STATUS_LABELS,
} from '@vl6/shared';
import { Button, Input, Select } from '@vl6/ui';

export interface MembersFilters {
  nome?: string;
  cim?: string;
  cidade?: string;
  grau?: string;
  situacao?: string;
  cargo?: string;
}

const DEBOUNCE_MS = 400;

/**
 * Filtros do Cadastro de Irmãos — antes só aplicavam ao clicar em
 * "Filtrar" (form estático server-rendered). Nome/CIM/Cidade agora
 * aplicam sozinhos ~400ms depois de parar de digitar, sem precisar de
 * clique nenhum (achado do Administrador: buscar sem apertar Enter/
 * Filtrar "não ia aparecendo" o resultado); Grau/Situação/Cargo aplicam
 * na hora, já que são seleção direta. "Filtrar" continua funcionando pra
 * quem prefere confirmar manualmente (também dispara na hora, sem
 * esperar o debounce). Troca de qualquer filtro reseta a paginação —
 * o conjunto filtrado muda, cursor da página antiga não faz mais sentido.
 */
export function MembersFilterForm({ initial }: { initial: MembersFilters }) {
  const router = useRouter();
  const [filters, setFilters] = useState<MembersFilters>(initial);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function navigate(next: MembersFilters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `/admin/pessoas/irmaos?${qs}` : '/admin/pessoas/irmaos');
  }

  function updateText(key: 'nome' | 'cim' | 'cidade', value: string) {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => navigate(next), DEBOUNCE_MS);
  }

  function updateSelect(key: 'grau' | 'situacao' | 'cargo', value: string) {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    navigate(next);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    navigate(filters);
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Input
        value={filters.nome ?? ''}
        onChange={(e) => updateText('nome', e.target.value)}
        placeholder="Nome…"
      />
      <Input
        value={filters.cim ?? ''}
        onChange={(e) => updateText('cim', e.target.value)}
        placeholder="CIM…"
      />
      <Input
        value={filters.cidade ?? ''}
        onChange={(e) => updateText('cidade', e.target.value)}
        placeholder="Cidade…"
      />
      <Select value={filters.grau ?? ''} onChange={(e) => updateSelect('grau', e.target.value)}>
        <option value="">Grau (todos)</option>
        {MEMBER_DEGREES.map((grau) => (
          <option key={grau} value={grau}>
            {grau}
          </option>
        ))}
      </Select>
      <Select
        value={filters.situacao ?? ''}
        onChange={(e) => updateSelect('situacao', e.target.value)}
      >
        <option value="">Situação (todas)</option>
        {MEMBER_SITUATION_STATUSES.map((situacao) => (
          <option key={situacao} value={situacao}>
            {MEMBER_SITUATION_STATUS_LABELS[situacao]}
          </option>
        ))}
      </Select>
      <Select value={filters.cargo ?? ''} onChange={(e) => updateSelect('cargo', e.target.value)}>
        <option value="">Cargo atual (todos)</option>
        {BOARD_POSITION_KEYS.map((cargo) => (
          <option key={cargo} value={cargo}>
            {BOARD_POSITION_LABELS[cargo]}
          </option>
        ))}
      </Select>
      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
        <Button type="submit" size="sm">
          Filtrar
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/pessoas/irmaos">Limpar</Link>
        </Button>
      </div>
    </form>
  );
}
