'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY,
  PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS,
  PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS,
  type ParamasonicEntityMemberCategory,
  type ParamasonicEntityMemberCategoryGroup,
  type ParamasonicEntityMemberSituation,
} from '@vl6/shared';
import { Badge, EmptyState, Select, Users } from '@vl6/ui';

export interface BrowserMember {
  id: string;
  nomeCompleto: string;
  memberId: string | null;
  cargo: string | null;
  categoria: ParamasonicEntityMemberCategory | null;
  situacao: ParamasonicEntityMemberSituation;
  /** Só preenchido na visão agregada (várias entidades juntas). */
  entidadeNome?: string;
  entidadeHref?: string;
}

const GROUP_ORDER: ParamasonicEntityMemberCategoryGroup[] = [
  'membros_juvenis',
  'membros_adultos',
  'outros_vinculos_apoio',
];
const SEM_CATEGORIA = 'sem_categoria' as const;

/**
 * Navegador de integrantes de entidade(s) paramaçônica(s) — mostra pedido do
 * Administrador: "todos os membros", segmentados pelas 3 categorias
 * institucionais (Membros Juvenis/Adultos/Outros Vínculos de Apoio) e
 * filtráveis. Reaproveitado tanto na tela pública de uma entidade
 * (`/paramaconicas/[entityId]`, sem coluna de entidade) quanto na visão
 * agregada de todas as entidades na Comunidade Paramaçônica (com coluna e
 * filtro de entidade). Filtro é só no navegador — não há paginação
 * server-side, então nunca esconde ninguém da contagem total.
 */
export function ParamasonicEntityMembersBrowser({
  members,
  showEntidadeColumn = false,
}: {
  members: BrowserMember[];
  showEntidadeColumn?: boolean;
}) {
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');
  const [situacaoFiltro, setSituacaoFiltro] = useState<string>('');
  const [entidadeFiltro, setEntidadeFiltro] = useState<string>('');

  const entidadeOptions = useMemo(() => {
    if (!showEntidadeColumn) return [];
    return [...new Set(members.map((m) => m.entidadeNome).filter(Boolean))] as string[];
  }, [members, showEntidadeColumn]);

  const filtered = members.filter((m) => {
    if (situacaoFiltro && m.situacao !== situacaoFiltro) return false;
    if (entidadeFiltro && m.entidadeNome !== entidadeFiltro) return false;
    if (categoriaFiltro) {
      const group = m.categoria
        ? PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY[m.categoria]
        : SEM_CATEGORIA;
      if (group !== categoriaFiltro) return false;
    }
    return true;
  });

  const groups = new Map<string, BrowserMember[]>();
  for (const member of filtered) {
    const key = member.categoria
      ? PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_BY_CATEGORY[member.categoria]
      : SEM_CATEGORIA;
    const bucket = groups.get(key) ?? [];
    bucket.push(member);
    groups.set(key, bucket);
  }
  const orderedGroups: Array<{ key: string; label: string; members: BrowserMember[] }> = [];
  for (const group of GROUP_ORDER) {
    const bucket = groups.get(group);
    if (bucket)
      orderedGroups.push({
        key: group,
        label: PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS[group],
        members: bucket,
      });
  }
  const semCategoria = groups.get(SEM_CATEGORIA);
  if (semCategoria)
    orderedGroups.push({
      key: SEM_CATEGORIA,
      label: 'Sem categoria definida',
      members: semCategoria,
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {showEntidadeColumn && entidadeOptions.length > 1 && (
          <Select
            value={entidadeFiltro}
            onChange={(e) => setEntidadeFiltro(e.target.value)}
            aria-label="Filtrar por entidade"
            className="w-auto"
          >
            <option value="">Todas as entidades</option>
            {entidadeOptions.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </Select>
        )}
        <Select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          aria-label="Filtrar por categoria"
          className="w-auto"
        >
          <option value="">Todas as categorias</option>
          {GROUP_ORDER.map((group) => (
            <option key={group} value={group}>
              {PARAMASONIC_ENTITY_MEMBER_CATEGORY_GROUP_LABELS[group]}
            </option>
          ))}
          <option value={SEM_CATEGORIA}>Sem categoria definida</option>
        </Select>
        <Select
          value={situacaoFiltro}
          onChange={(e) => setSituacaoFiltro(e.target.value)}
          aria-label="Filtrar por situação"
          className="w-auto"
        >
          <option value="">Todas as situações</option>
          {Object.entries(PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <span className="text-muted self-center text-xs">{filtered.length} integrante(s)</span>
      </div>

      {orderedGroups.length === 0 ? (
        <EmptyState
          icon={<Users size={22} strokeWidth={1.75} />}
          title="Nenhum integrante encontrado"
          description="Ajuste os filtros acima para ver outros integrantes."
        />
      ) : (
        orderedGroups.map((group) => (
          <div key={group.key} className="flex flex-col gap-2">
            <h3 className="text-muted text-xs font-semibold uppercase tracking-wide">
              {group.label} ({group.members.length})
            </h3>
            <div className="border-border overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-surface text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Nome</th>
                    {showEntidadeColumn && (
                      <th className="px-4 py-2 text-left font-medium">Entidade</th>
                    )}
                    <th className="px-4 py-2 text-left font-medium">Cargo</th>
                    <th className="px-4 py-2 text-left font-medium">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {group.members.map((member) => (
                    <tr key={member.id} className="border-border border-t">
                      <td className="px-4 py-2">
                        {member.memberId ? (
                          <Link
                            href={`/irmaos/${member.memberId}`}
                            className="text-accent hover:underline"
                          >
                            {member.nomeCompleto}
                          </Link>
                        ) : (
                          member.nomeCompleto
                        )}
                      </td>
                      {showEntidadeColumn && (
                        <td className="text-muted px-4 py-2">
                          {member.entidadeHref ? (
                            <Link href={member.entidadeHref} className="hover:underline">
                              {member.entidadeNome}
                            </Link>
                          ) : (
                            member.entidadeNome
                          )}
                        </td>
                      )}
                      <td className="text-muted px-4 py-2">{member.cargo ?? '—'}</td>
                      <td className="px-4 py-2">
                        <Badge variant={member.situacao === 'ativo' ? 'success' : 'outline'}>
                          {PARAMASONIC_ENTITY_MEMBER_SITUATION_LABELS[member.situacao]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
