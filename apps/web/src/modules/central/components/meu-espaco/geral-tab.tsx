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
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

export function GeralTab({
  member,
  profile,
  myCommittees,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  myCommittees: Committee[];
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
              maxLength={500}
              defaultValue={profile?.apresentacao ?? ''}
            />
          </FormField>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>

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

      {myCommittees.length > 0 && (
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
