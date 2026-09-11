'use client';

import { useState, useTransition } from 'react';
import type { DuplicateMemberGroup } from '@vl6/domain';
import { Badge, Button, Card, CardContent, EmptyState } from '@vl6/ui';
import { MemberAvatar } from '@/components/membership/member-avatar';
import {
  loadDuplicateMembersAction,
  mergeDuplicateMembersAction,
} from '../actions/duplicate-member-actions';

export interface DuplicateMemberManagerProps {
  initialGroups: DuplicateMemberGroup[];
}

/**
 * `/admin/pessoas/irmaos/duplicados` — grupos automáticos de Irmãos com o
 * mesmo nome (normalizado), pra corrigir cadastros repetidos (ex.:
 * importação histórica que criou um novo cadastro por causa de uma
 * variação de grafia). O Administrador escolhe qual manter como canônico;
 * o resto é mesclado nele (histórico reatribuído, nunca perdido) e
 * arquivado.
 */
export function DuplicateMemberManager({ initialGroups }: DuplicateMemberManagerProps) {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedCanonical, setSelectedCanonical] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleMerge(group: DuplicateMemberGroup) {
    const canonicalMemberId = selectedCanonical[group.nomeNormalizado] ?? group.membros[0]!.id;
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
      setGroups(await loadDuplicateMembersAction());
    });
  }

  if (groups.length === 0) {
    return <EmptyState title="Nenhum Irmão duplicado encontrado." />;
  }

  return (
    <div className="flex flex-col gap-6">
      {message && (
        <p className={`text-sm ${message.error ? 'text-red-600' : 'text-emerald-700'}`}>
          {message.text}
        </p>
      )}

      {groups.map((group) => {
        const canonicalId = selectedCanonical[group.nomeNormalizado] ?? group.membros[0]!.id;
        return (
          <Card key={group.nomeNormalizado}>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{group.membros[0]!.nomeCompleto}</p>
                <Badge variant="outline">{group.membros.length} cadastros</Badge>
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
                        onChange={() =>
                          setSelectedCanonical((current) => ({
                            ...current,
                            [group.nomeNormalizado]: member.id,
                          }))
                        }
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
                onClick={() => handleMerge(group)}
              >
                {isPending ? 'Mesclando…' : 'Mesclar duplicados'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
