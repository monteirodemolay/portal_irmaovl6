'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { MemberCentralProfile } from '@vl6/domain';
import { AFFILIATION_ABRANGENCIA_KEYS, AFFILIATION_ABRANGENCIA_LABELS } from '@vl6/shared';
import type { CentralAffiliationEntryValues } from '@vl6/shared';
import { Button, Handshake, Input, Textarea, X } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import { LogoUploader } from './logo-uploader';

const MAX_AFILIACOES = 20;

type AfiliacaoDraft = CentralAffiliationEntryValues;

function emptyAfiliacao(): AfiliacaoDraft {
  return {
    id: crypto.randomUUID(),
    nomeInstituicao: '',
    papel: null,
    abrangencia: null,
    pais: null,
    descricao: null,
    siteUrl: null,
    instagram: null,
    logoUrl: null,
  };
}

/**
 * "Outras afiliações" — Associações, Instituições ou organizações sem fins
 * lucrativos das quais o Irmão faça parte, nacionais ou internacionais.
 * Mesmo padrão estrutural de `EmpresaTab` (array local + hidden JSON input,
 * um `<input type="file">` de logo por card), mas mais simples: sem CNPJ,
 * sem contato comercial, sem revisão da Administração — o conteúdo é
 * publicado direto quando o bloco `afiliacoes` está ligado em Privacidade,
 * mesmo espírito de `competencias`/`servicos`/redes sociais pessoais.
 */
export function AfiliacoesTab({ profile }: { profile: MemberCentralProfile | null }) {
  const [contentState, contentAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );
  const [afiliacoes, setAfiliacoes] = useState<AfiliacaoDraft[]>(profile?.afiliacoes ?? []);

  function updateAfiliacao(index: number, patch: Partial<AfiliacaoDraft>) {
    setAfiliacoes((current) => current.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  return (
    <FormSectionCard
      icon={Handshake}
      title="Outras afiliações"
      description={`Até ${MAX_AFILIACOES} vínculos com Associações, Instituições ou organizações sem fins lucrativos das quais você faça parte — no Brasil ou no exterior. Não passa por revisão da Administração; você é responsável pelo conteúdo, como já acontece com suas redes sociais.`}
    >
      <form action={contentAction} className="flex flex-col gap-4">
        {afiliacoes.map((afiliacao, index) => (
          <div
            key={afiliacao.id}
            className="border-border bg-background flex flex-col gap-4 rounded-xl border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <LogoUploader
                  inputName={`logo-afiliacao-${afiliacao.id}`}
                  imageUrl={afiliacao.logoUrl}
                  entityLabel={afiliacao.nomeInstituicao}
                />
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-muted text-xs font-semibold uppercase tracking-wide">
                    Afiliação {index + 1}
                  </span>
                  <p className="text-muted text-xs">
                    Logo opcional — aceita JPG, PNG, WEBP, SVG ou GIF (até 5 MB).
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remover afiliação ${index + 1}`}
                onClick={() => setAfiliacoes((current) => current.filter((_, i) => i !== index))}
                className="text-muted hover:text-foreground hover:bg-surface rounded-full p-1 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nome da instituição" htmlFor={`afiliacao-nome-${index}`}>
                <Input
                  id={`afiliacao-nome-${index}`}
                  value={afiliacao.nomeInstituicao}
                  onChange={(e) => updateAfiliacao(index, { nomeInstituicao: e.target.value })}
                />
              </FormField>
              <FormField label="Papel/função" htmlFor={`afiliacao-papel-${index}`}>
                <Input
                  id={`afiliacao-papel-${index}`}
                  placeholder="Ex.: Membro, Diretor, Conselheiro"
                  value={afiliacao.papel ?? ''}
                  onChange={(e) => updateAfiliacao(index, { papel: e.target.value || null })}
                />
              </FormField>
              <FormField label="Abrangência" htmlFor={`afiliacao-abrangencia-${index}`}>
                <select
                  id={`afiliacao-abrangencia-${index}`}
                  className="border-border bg-surface h-10 w-full rounded-lg border px-3 text-sm"
                  value={afiliacao.abrangencia ?? ''}
                  onChange={(e) =>
                    updateAfiliacao(index, {
                      abrangencia: (e.target.value || null) as AfiliacaoDraft['abrangencia'],
                    })
                  }
                >
                  <option value="">Não informado</option>
                  {AFFILIATION_ABRANGENCIA_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {AFFILIATION_ABRANGENCIA_LABELS[key]}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="País" htmlFor={`afiliacao-pais-${index}`}>
                <Input
                  id={`afiliacao-pais-${index}`}
                  placeholder="Mais relevante quando internacional"
                  value={afiliacao.pais ?? ''}
                  onChange={(e) => updateAfiliacao(index, { pais: e.target.value || null })}
                />
              </FormField>
            </div>

            <FormField label="Descrição" htmlFor={`afiliacao-descricao-${index}`}>
              <Textarea
                id={`afiliacao-descricao-${index}`}
                rows={2}
                value={afiliacao.descricao ?? ''}
                onChange={(e) => updateAfiliacao(index, { descricao: e.target.value || null })}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Instagram" htmlFor={`afiliacao-instagram-${index}`}>
                <Input
                  id={`afiliacao-instagram-${index}`}
                  placeholder="@usuario"
                  value={afiliacao.instagram ?? ''}
                  onChange={(e) => updateAfiliacao(index, { instagram: e.target.value || null })}
                />
              </FormField>
              <FormField label="Site" htmlFor={`afiliacao-site-${index}`}>
                <Input
                  id={`afiliacao-site-${index}`}
                  type="url"
                  placeholder="https://…"
                  value={afiliacao.siteUrl ?? ''}
                  onChange={(e) => updateAfiliacao(index, { siteUrl: e.target.value || null })}
                />
              </FormField>
            </div>
          </div>
        ))}
        {afiliacoes.length < MAX_AFILIACOES && (
          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={() => setAfiliacoes((current) => [...current, emptyAfiliacao()])}
          >
            Adicionar afiliação
          </Button>
        )}
        <input type="hidden" name="afiliacoes" value={JSON.stringify(afiliacoes)} />
        {contentState.error && <p className="text-sm text-red-600">{contentState.error}</p>}
        <SubmitButton />
      </form>
    </FormSectionCard>
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
