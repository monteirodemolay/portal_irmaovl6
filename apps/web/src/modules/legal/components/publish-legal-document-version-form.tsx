'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { LegalDocumentKey } from '@vl6/domain';
import { Button, Input, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { CLASSIFICATION_LABELS, IMPACT_LABELS } from '../lib/labels';
import {
  publishLegalDocumentVersionAction,
  type PublishLegalDocumentVersionActionState,
} from '../actions/legal-admin-actions';

const initialState: PublishLegalDocumentVersionActionState = { error: null };

export function PublishLegalDocumentVersionForm({
  documento,
  proximaVersaoSugerida,
  conteudoAtual,
  responsavelPadrao,
}: {
  documento: LegalDocumentKey;
  /** Próxima versão semver sugerida (ex.: incrementa o PATCH da vigente) — o admin pode alterar. */
  proximaVersaoSugerida: string;
  /** Texto vigente, usado como ponto de partida da edição — nunca em branco. */
  conteudoAtual: string;
  responsavelPadrao: string;
}) {
  const [state, formAction] = useActionState(publishLegalDocumentVersionAction, initialState);

  return (
    <form action={formAction} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="documento" value={documento} />

      <FormField
        label="Texto completo (Markdown)"
        htmlFor="conteudoMarkdown"
        description="Suporta títulos (#, ##, ###), listas (- item), citação (> texto) e **negrito**. Este será o texto exibido aos Irmãos."
      >
        <Textarea
          id="conteudoMarkdown"
          name="conteudoMarkdown"
          required
          rows={24}
          className="font-mono text-xs"
          defaultValue={conteudoAtual}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Versão (semver)"
          htmlFor="versao"
          description="Formato MAJOR.MINOR.PATCH, ex.: 1.0.1."
        >
          <Input id="versao" name="versao" required defaultValue={proximaVersaoSugerida} />
        </FormField>
        <FormField label="Responsável" htmlFor="responsavel">
          <Input
            id="responsavel"
            name="responsavel"
            required
            defaultValue={responsavelPadrao}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Classificação da mudança" htmlFor="classificacao">
          <Select id="classificacao" name="classificacao" defaultValue="correcao">
            {Object.entries(CLASSIFICATION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Impacto" htmlFor="impacto">
          <Select id="impacto" name="impacto" defaultValue="baixo">
            {Object.entries(IMPACT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </FormField>
      </div>

      <FormField
        label="Motivo desta versão"
        htmlFor="motivo"
        description="Explicação institucional do porquê desta mudança — fica registrada no histórico de versões."
      >
        <Textarea id="motivo" name="motivo" required rows={3} />
      </FormField>

      <FormField
        label="Itens alterados"
        htmlFor="itensAlterados"
        description="Um item por linha — aparece como lista no histórico de versões."
      >
        <Textarea id="itensAlterados" name="itensAlterados" required rows={3} />
      </FormField>

      <FormField
        label="Resumo para os Irmãos (opcional)"
        htmlFor="diffResumo"
        description="Texto curto mostrado no aviso de aceite quando esta versão exige novo aceite. Deixe em branco para não exibir resumo."
      >
        <Textarea id="diffResumo" name="diffResumo" rows={2} />
      </FormField>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="exigeNovoAceite" className="h-4 w-4" />
        Exigir novo aceite dos Irmãos (notifica todos os usuários ativos)
      </label>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Publicando…' : 'Publicar nova versão'}
    </Button>
  );
}
