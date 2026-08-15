'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { AREA_ATUACAO_KEYS, AREA_ATUACAO_LABELS, type AreaAtuacaoKey } from '@vl6/shared';
import type { Member, MemberCentralProfile } from '@vl6/domain';
import { Button, Input, Select, Sparkles, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';
import { ProfessionalCard } from '@/modules/membership/components/profile-fields/professional-card';
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
  const [contentState, contentAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );
  const [tagsState, tagsAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );

  const [areaAtuacao, setAreaAtuacao] = useState<AreaAtuacaoKey | ''>(profile?.areaAtuacao ?? '');

  return (
    <div className="flex flex-col gap-4">
      <ProfessionalCard
        member={member}
        action={updateMyProfileAction}
        customProfessions={customProfessions}
      />

      <FormSectionCard
        icon={Sparkles}
        title="Perfil profissional na Central"
        description="Aparece no seu perfil da Central quando o bloco Profissional estiver publicado."
      >
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
