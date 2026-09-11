'use client';

import { useState, useTransition } from 'react';
import type { DuplicateMemberGroup, DuplicateMemberSummary } from '@vl6/domain';
import { Badge, Button, Card, CardContent, EmptyState, Input } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import {
  loadDuplicateMembersAction,
  mergeDuplicateMembersAction,
  searchMembersForMergeAction,
} from '../actions/duplicate-member-actions';

export interface DuplicateMemberManagerProps {
  initialGroups: DuplicateMemberGroup[];
}

/**
 * Um grupo candidato a mesclagem — automático (achado por
 * `loadDuplicateMembersAction`, nome idêntico ou parecido) ou manual
 * (montado pelo Administrador via busca, `onRemove` presente). Mesma UI
 * pros dois casos: escolher o canônico (radio) e confirmar a mesclagem.
 */
function MergeGroupCard({
  group,
  isPending,
  onMerge,
  onRemove,
}: {
  group: DuplicateMemberGroup;
  isPending: boolean;
  onMerge: (group: DuplicateMemberGroup, canonicalMemberId: string) => void;
  onRemove?: () => void;
}) {
  const [canonicalId, setCanonicalId] = useState(group.membros[0]!.id);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-medium">{group.membros[0]!.nomeCompleto}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{group.membros.length} cadastros</Badge>
            {onRemove && (
              <Button type="button" variant="outline" size="sm" onClick={onRemove}>
                Remover da lista
              </Button>
            )}
          </div>
        </div>

        <p className="text-muted text-xs">
          Escolha qual cadastro manter — os outros são mesclados nele (histórico de cargos,
          situações e titularidades reatribuídos, nada se perde) e arquivados.
        </p>

        <ul className="flex flex-col gap-2">
          {group.membros.map((member) => (
            <li
              key={member.id}
              className="border-border flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <label className="flex min-w-[240px] flex-1 items-center gap-3">
                <input
                  type="radio"
                  name={`canonical-${group.nomeNormalizado}`}
                  checked={canonicalId === member.id}
                  onChange={() => setCanonicalId(member.id)}
                  className="h-4 w-4"
                />
                <MemberAvatar
                  fotoUrl={member.fotoUrl}
                  nome={member.nomeCompleto}
                  className="h-9 w-9"
                  disablePreview
                />
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{member.nomeCompleto}</span>
                  <span className="text-muted text-xs">
                    {member.situacao}
                    {member.temAcesso ? ' · tem login' : ''} · cadastrado em{' '}
                    {new Intl.DateTimeFormat('pt-BR').format(new Date(member.createdAt))}
                  </span>
                </span>
              </label>
              {canonicalId === member.id && (
                <Badge variant="accent" className="shrink-0">
                  Manter este
                </Badge>
              )}
            </li>
          ))}
        </ul>

        <Button
          type="button"
          className="w-fit"
          disabled={isPending}
          onClick={() => onMerge(group, canonicalId)}
        >
          {isPending ? 'Mesclando…' : 'Mesclar duplicados'}
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Busca manual — complementa a detecção automática (que só pega nome
 * idêntico ou parecido). Cobre o resto: apelido, nome do meio omitido,
 * grafia bem diferente. O Administrador marca quem quer juntar e adiciona
 * como um grupo de mesclagem manual, com a mesma revisão/confirmação de um
 * grupo automático.
 */
function ManualSearch({ onAddGroup }: { onAddGroup: (group: DuplicateMemberGroup) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DuplicateMemberSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, startSearch] = useTransition();
  const [searched, setSearched] = useState(false);

  function handleSearch() {
    startSearch(async () => {
      const found = await searchMembersForMergeAction(query);
      setResults(found);
      setSelectedIds(new Set());
      setSearched(true);
    });
  }

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAdd() {
    const membros = results.filter((r) => selectedIds.has(r.id));
    if (membros.length < 2) return;
    onAddGroup({ nomeNormalizado: `manual-${Date.now()}`, membros });
    setResults([]);
    setSelectedIds(new Set());
    setQuery('');
    setSearched(false);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <p className="font-medium">Buscar Irmão pra revisar duplicidade</p>
        <p className="text-muted text-xs">
          A lista acima só pega nome idêntico ou bem parecido — use a busca pra achar outros casos
          (apelido, nome grafado bem diferente etc.) e marque quem é a mesma pessoa.
        </p>
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Nome do Irmão (mínimo 3 letras)"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleSearch}
            disabled={isSearching || query.trim().length < 3}
            className="shrink-0"
          >
            {isSearching ? 'Buscando…' : 'Buscar'}
          </Button>
        </div>

        {searched && results.length === 0 && (
          <p className="text-muted text-xs">Nenhum Irmão encontrado com esse nome.</p>
        )}

        {results.length > 0 && (
          <>
            <ul className="flex flex-col gap-2">
              {results.map((member) => (
                <li
                  key={member.id}
                  className="border-border flex items-center gap-3 rounded-lg border p-3"
                >
                  <label className="flex flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.id)}
                      onChange={() => toggle(member.id)}
                      className="h-4 w-4"
                    />
                    <MemberAvatar
                      fotoUrl={member.fotoUrl}
                      nome={member.nomeCompleto}
                      className="h-9 w-9"
                      disablePreview
                    />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium">{member.nomeCompleto}</span>
                      <span className="text-muted text-xs">
                        {member.situacao}
                        {member.temAcesso ? ' · tem login' : ''} · cadastrado em{' '}
                        {new Intl.DateTimeFormat('pt-BR').format(new Date(member.createdAt))}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              disabled={selectedIds.size < 2}
              onClick={handleAdd}
            >
              Marcar {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}selecionados como
              duplicados
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * `/admin/pessoas/irmaos/duplicados` — grupos automáticos de Irmãos com o
 * mesmo nome (idêntico ou parecido), pra corrigir cadastros repetidos
 * (ex.: importação histórica que criou um novo cadastro por causa de uma
 * variação de grafia), mais busca manual pro resto dos casos. O
 * Administrador escolhe qual manter como canônico; o resto é mesclado
 * nele (histórico reatribuído, nunca perdido) e arquivado.
 */
export function DuplicateMemberManager({ initialGroups }: DuplicateMemberManagerProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [manualGroups, setManualGroups] = useState<DuplicateMemberGroup[]>([]);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMerge(group: DuplicateMemberGroup, canonicalMemberId: string) {
    const duplicateMemberIds = group.membros
      .map((m) => m.id)
      .filter((id) => id !== canonicalMemberId);

    setMessage(null);
    startTransition(async () => {
      const result = await mergeDuplicateMembersAction(canonicalMemberId, duplicateMemberIds);
      if (!result.ok) {
        setMessage({ text: result.error, error: true });
        return;
      }
      setMessage({
        text: `${result.report.cadastrosMesclados} cadastro(s) mesclado(s) em ${group.membros.find((m) => m.id === canonicalMemberId)?.nomeCompleto}.`,
        error: false,
      });
      setManualGroups((current) =>
        current.filter((g) => g.nomeNormalizado !== group.nomeNormalizado),
      );
      setGroups(await loadDuplicateMembersAction());
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      <ManualSearch onAddGroup={(group) => setManualGroups((current) => [group, ...current])} />

      {manualGroups.map((group) => (
        <MergeGroupCard
          key={group.nomeNormalizado}
          group={group}
          isPending={isPending}
          onMerge={handleMerge}
          onRemove={() =>
            setManualGroups((current) =>
              current.filter((g) => g.nomeNormalizado !== group.nomeNormalizado),
            )
          }
        />
      ))}

      {groups.length === 0
        ? manualGroups.length === 0 && (
            <EmptyState title="Nenhum Irmão duplicado encontrado automaticamente." />
          )
        : groups.map((group) => (
            <MergeGroupCard
              key={group.nomeNormalizado}
              group={group}
              isPending={isPending}
              onMerge={handleMerge}
            />
          ))}
    </div>
  );
}
