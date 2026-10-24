'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { Committee, Member, MemberCentralProfile } from '@vl6/domain';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Quote, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';

function formatDate(date: Date | null): string {
  if (!date) return '—';
  // Datas maçônicas são só calendário (guardadas como meia-noite UTC, sem
  // hora real) — formatar sem `timeZone: 'UTC'` aqui (componente client,
  // roda no fuso do navegador) mostra o dia anterior para todo Irmão a
  // oeste de Greenwich, ex.: Brasil (UTC-3) via meia-noite UTC de 28/09
  // vira 27/09 21h locais.
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long', timeZone: 'UTC' }).format(
    new Date(date),
  );
}

export function GeralTab({
  member,
  profile,
  myCommittees,
  showInstitutional = true,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  myCommittees: Committee[];
  showInstitutional?: boolean;
}) {
  const [state, formAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );

  return (
    <div className="flex flex-col gap-4">
      <FormSectionCard
        icon={Quote}
        title="Apresentação"
        description="Uma breve descrição sobre você, visível aos demais Irmãos quando este bloco estiver publicado."
      >
        <form action={formAction} className="flex flex-col gap-3">
          <FormField label="Sobre mim" htmlFor="apresentacao">
            <Textarea
              id="apresentacao"
              name="apresentacao"
              rows={8}
              maxLength={4000}
              defaultValue={profile?.apresentacao ?? ''}
            />
          </FormField>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          {state.success && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">✓ {state.success}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>

      {showInstitutional && (
        <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados maçônicos</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="flex flex-col gap-1.5 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Iniciação</dt>
              <dd>{formatDate(member.dataIniciacao)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Elevação</dt>
              <dd>{formatDate(member.dataElevacao)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Exaltação</dt>
              <dd>{formatDate(member.dataExaltacao)}</dd>
            </div>
          </dl>
        </CardContent>
        </Card>
      )}

      {showInstitutional && myCommittees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Minhas Comissões</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {myCommittees.map((committee) => (
              <Badge key={committee.id} variant="accent">
                {committee.nome}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" className="w-fit" disabled={pending}>
      {pending ? 'Salvando…' : 'Salvar'}
    </Button>
  );
}
