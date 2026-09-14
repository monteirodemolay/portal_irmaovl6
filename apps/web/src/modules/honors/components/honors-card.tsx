'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { HONOR_TYPE_KEYS, HONOR_TYPE_LABELS, type HonorTypeKey } from '@vl6/shared';
import type { Honor } from '@vl6/domain';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Select, X } from '@vl6/ui';
import {
  registerHonorAction,
  removeHonorAction,
  type HonorActionState,
} from '../actions/honor-actions';

function formatDate(date: Date | null): string {
  return date ? new Intl.DateTimeFormat('pt-BR').format(new Date(date)) : 'data não registrada';
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando…' : 'Adicionar honraria'}
    </Button>
  );
}

/**
 * "Honrarias e Condecorações" — levantamento institucional do Administrador
 * §3 (medalhas, comendas, diplomas…). Cadastro sempre vinculado a este
 * Irmão (`memberId`); homenageados externos (§5/§6 do levantamento) não
 * passam por este cartão — ficam pra uma tela própria de Galeria de Honra
 * (Fase 4). Mesmo padrão de `MemberTitlesCard`: chips + form, sem edição.
 */
export function HonorsCard({ memberId, honors }: { memberId: string; honors: Honor[] }) {
  const boundAction = registerHonorAction.bind(null, memberId);
  const [state, formAction] = useActionState<HonorActionState, FormData>(boundAction, {
    error: null,
  });
  const [tipo, setTipo] = useState<HonorTypeKey>('medalha');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Honrarias e Condecorações</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {honors.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {honors.map((honor) => (
              <li
                key={honor.id}
                className="border-border bg-background flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{honor.nomeOficial}</span>
                  <span className="text-muted text-xs">
                    {HONOR_TYPE_LABELS[honor.tipo]} · {honor.instituicaoConcedente} ·{' '}
                    {formatDate(honor.data)}
                  </span>
                </div>
                <form action={removeHonorAction.bind(null, honor.id, memberId)}>
                  <button
                    type="submit"
                    className="text-muted hover:text-destructive rounded-full p-0.5"
                    aria-label="Remover honraria"
                  >
                    <X size={14} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted text-sm">Nenhuma honraria cadastrada ainda.</p>
        )}

        <form action={formAction} className="border-border flex flex-col gap-3 border-t pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nomeOficial">Nome oficial da honraria</Label>
              <Input id="nomeOficial" name="nomeOficial" placeholder="Ex.: Medalha do Mérito" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                id="tipo"
                name="tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as HonorTypeKey)}
              >
                {HONOR_TYPE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {HONOR_TYPE_LABELS[key]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="instituicaoConcedente">Instituição concedente</Label>
              <Input
                id="instituicaoConcedente"
                name="instituicaoConcedente"
                placeholder="Ex.: GLEG"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="data">Data</Label>
              <Input id="data" name="data" type="date" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="numeroAto">Número do ato (opcional)</Label>
              <Input id="numeroAto" name="numeroAto" placeholder="Ex.: Portaria 12/2020" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="motivo">Motivo (opcional)</Label>
              <Input id="motivo" name="motivo" placeholder="Ex.: 25 anos de iniciação" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="descricaoHistorica">Descrição histórica (opcional)</Label>
            <Input
              id="descricaoHistorica"
              name="descricaoHistorica"
              placeholder="Contexto pra exibir no 'Ver detalhes' do Perfil"
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
