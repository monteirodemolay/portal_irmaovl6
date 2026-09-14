'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { MEMBER_TITLE_KEYS, MEMBER_TITLE_LABELS, type MemberTitleKey } from '@vl6/shared';
import type { MemberTitle } from '@vl6/domain';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, X } from '@vl6/ui';
import {
  registerMemberTitleAction,
  removeMemberTitleAction,
  type MemberTitleActionState,
} from '../actions/honor-actions';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : 'data não registrada';
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando…' : 'Adicionar título'}
    </Button>
  );
}

/**
 * "Títulos e Condições Maçônicas" — levantamento institucional do
 * Administrador §2 (Mestre Instalado, Benfeitor, Membro Honorário, Membro
 * Remido, Fundador…). Fase 1 do domínio de Honrarias: cadastro simples
 * (adicionar/remover), sem edição — corrigir um lançamento errado é remover
 * e recadastrar. Exibida no painel de edição administrativa do Irmão; a aba
 * "Trajetória e Honrarias" do Perfil único (Fase 2/3) reaproveita os mesmos
 * dados só pra leitura.
 */
export function MemberTitlesCard({
  memberId,
  titles,
}: {
  memberId: string;
  titles: MemberTitle[];
}) {
  const boundAction = registerMemberTitleAction.bind(null, memberId);
  const [state, formAction] = useActionState<MemberTitleActionState, FormData>(boundAction, {
    error: null,
  });
  const [titulo, setTitulo] = useState<MemberTitleKey>('benfeitor');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Títulos e Condições Maçônicas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {titles.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {titles.map((title) => (
              <li
                key={title.id}
                className="border-border bg-background flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-2 text-sm"
              >
                <span className="font-medium">
                  {title.titulo === 'outro' ? title.tituloOutro : MEMBER_TITLE_LABELS[title.titulo]}
                </span>
                <span className="text-muted text-xs">{formatDate(title.dataConcessao)}</span>
                <form action={removeMemberTitleAction.bind(null, title.id, memberId)}>
                  <button
                    type="submit"
                    className="text-muted hover:text-destructive rounded-full p-0.5"
                    aria-label="Remover título"
                  >
                    <X size={12} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Nenhum título cadastrado ainda.</p>
        )}

        <form action={formAction} className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="titulo">Título</Label>
              <Select
                id="titulo"
                name="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value as MemberTitleKey)}
              >
                {MEMBER_TITLE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {MEMBER_TITLE_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dataConcessao">Data de concessão</Label>
              <Input id="dataConcessao" name="dataConcessao" type="date" />
            </div>
          </div>

          {titulo === 'outro' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tituloOutro">Nome do título</Label>
              <Input id="tituloOutro" name="tituloOutro" placeholder="Ex.: Membro Benemérito" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fundamento">Fundamento documental (opcional)</Label>
            <Input
              id="fundamento"
              name="fundamento"
              placeholder="Ex.: Ata da Sessão de 12/08/2020"
            />
          </div>

          {state.error && <p className="text-destructive text-sm">{state.error}</p>}

          <div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
