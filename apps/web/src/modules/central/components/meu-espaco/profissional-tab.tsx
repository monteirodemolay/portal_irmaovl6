'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AREA_ATUACAO_KEYS, AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import type { Member, MemberCentralProfile } from '@vl6/domain';
import { Briefcase, Button, Input, Select, Sparkles, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { COMMON_PROFESSIONS, OTHER_PROFESSION_VALUE } from '@/lib/membership/professions';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import {
  updateMyProfileAction,
  type SelfProfileActionState,
} from '@/modules/membership/actions/self-profile-actions';
import { TagInput } from './tag-input';

export function ProfissionalTab({
  member,
  profile,
  customProfessions = [],
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  customProfessions?: string[];
}) {
  const [selfState, selfAction] = useActionState<SelfProfileActionState, FormData>(
    updateMyProfileAction,
    { error: null },
  );
  const [contentState, contentAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );
  const [tagsState, tagsAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );

  const professionOptions = [...COMMON_PROFESSIONS, ...customProfessions];
  const initialProfissaoSelect = member.profissao
    ? professionOptions.includes(member.profissao)
      ? member.profissao
      : OTHER_PROFESSION_VALUE
    : '';
  const [profissaoSelect, setProfissaoSelect] = useState(initialProfissaoSelect);

  const [areaAtuacao, setAreaAtuacao] = useState<AreaAtuacaoKey | ''>(profile?.areaAtuacao ?? '');

  return (
    <div className="flex flex-col gap-4">
      <FormSectionCard icon={Briefcase} title="Informações profissionais">
        <form action={selfAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Profissão" htmlFor="profissao">
              <Select
                id="profissao"
                name="profissao"
                value={profissaoSelect}
                onChange={(event) => setProfissaoSelect(event.target.value)}
              >
                <option value="">Selecione</option>
                {professionOptions.map((profissao) => (
                  <option key={profissao} value={profissao}>
                    {profissao}
                  </option>
                ))}
                <option value={OTHER_PROFESSION_VALUE}>Outra</option>
              </Select>
            </FormField>
            {profissaoSelect === OTHER_PROFESSION_VALUE && (
              <FormField label="Qual profissão?" htmlFor="profissaoOutra">
                <Input
                  id="profissaoOutra"
                  name="profissaoOutra"
                  defaultValue={
                    member.profissao && !professionOptions.includes(member.profissao)
                      ? member.profissao
                      : ''
                  }
                />
              </FormField>
            )}
          </div>
          {selfState.error && <p className="text-sm text-red-600">{selfState.error}</p>}
          <SubmitButton />
        </form>

        <div className="border-border-soft mt-2 flex flex-col gap-4 border-t pt-4">
          <form action={contentAction} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Área de atuação" htmlFor="areaAtuacao">
                <Select
                  id="areaAtuacao"
                  name="areaAtuacao"
                  value={areaAtuacao}
                  onChange={(event) => setAreaAtuacao(event.target.value as AreaAtuacaoKey)}
                >
                  <option value="">Selecione</option>
                  {AREA_ATUACAO_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {AREA_ATUACAO_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </FormField>
              {areaAtuacao === 'outra' && (
                <FormField label="Qual área?" htmlFor="areaAtuacaoOutra">
                  <Input
                    id="areaAtuacaoOutra"
                    name="areaAtuacaoOutra"
                    defaultValue={profile?.areaAtuacaoOutra ?? ''}
                  />
                </FormField>
              )}
              <FormField label="Formação" htmlFor="formacao">
                <Input id="formacao" name="formacao" defaultValue={profile?.formacao ?? ''} />
              </FormField>
            </div>
            <FormField label="Como posso ajudar" htmlFor="resumoProfissional">
              <Textarea
                id="resumoProfissional"
                name="resumoProfissional"
                maxLength={1000}
                defaultValue={profile?.resumoProfissional ?? ''}
              />
            </FormField>
            {contentState.error && <p className="text-sm text-red-600">{contentState.error}</p>}
            <SubmitButton />
          </form>
        </div>
      </FormSectionCard>

      <FormSectionCard
        icon={Sparkles}
        title="Competências e serviços"
        description="Palavras-chave que ajudam outros Irmãos a te encontrar no Diretório."
      >
        <form action={tagsAction} className="flex flex-col gap-4">
          <FormField label="Competências" htmlFor="competencias-input">
            <TagInput
              name="competencias"
              defaultValue={profile?.competencias ?? []}
              placeholder="Ex.: Negociação, Excel avançado…"
            />
          </FormField>
          <FormField label="Serviços" htmlFor="servicos-input">
            <TagInput
              name="servicos"
              defaultValue={profile?.servicos ?? []}
              placeholder="Ex.: Consultoria jurídica, Manutenção elétrica…"
            />
          </FormField>
          {tagsState.error && <p className="text-sm text-red-600">{tagsState.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>
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
