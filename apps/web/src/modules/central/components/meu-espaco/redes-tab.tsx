'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { MemberCentralProfile, PublicationSettings } from '@vl6/domain';
import {
  Button,
  Facebook,
  Globe,
  GraduationCap,
  Input,
  Instagram,
  Linkedin,
  MessageCircle,
  Share2,
} from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { FormSectionCard } from '@/components/forms/section-card';
import { updateCentralProfileAction, type CentralActionState } from '../../actions/central-actions';
import { VisibilityMiniForm } from './visibility-mini-form';

export function RedesTab({
  profile,
  settings,
}: {
  profile: MemberCentralProfile | null;
  settings: PublicationSettings | null;
}) {
  const [state, formAction] = useActionState<CentralActionState, FormData>(
    updateCentralProfileAction,
    { error: null },
  );

  return (
    <div className="flex flex-col gap-4">
      <FormSectionCard icon={Share2} title="Redes e perfis externos">
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="WhatsApp" htmlFor="linkWhatsapp" description="Ex.: (64) 99999-9999">
              <Input
                id="linkWhatsapp"
                name="linkWhatsapp"
                defaultValue={profile?.externalLinks.whatsapp ?? ''}
              />
            </FormField>
            <FormField label="Instagram" htmlFor="linkInstagram" description="@usuario ou URL">
              <Input
                id="linkInstagram"
                name="linkInstagram"
                defaultValue={profile?.externalLinks.instagram ?? ''}
              />
            </FormField>
            <FormField label="Facebook" htmlFor="linkFacebook">
              <Input
                id="linkFacebook"
                name="linkFacebook"
                defaultValue={profile?.externalLinks.facebook ?? ''}
              />
            </FormField>
            <FormField label="LinkedIn" htmlFor="linkLinkedin">
              <Input
                id="linkLinkedin"
                name="linkLinkedin"
                defaultValue={profile?.externalLinks.linkedin ?? ''}
              />
            </FormField>
            <FormField label="Currículo Lattes" htmlFor="linkLattes">
              <Input
                id="linkLattes"
                name="linkLattes"
                defaultValue={profile?.externalLinks.lattes ?? ''}
              />
            </FormField>
            <FormField label="Site / portfólio" htmlFor="linkSite">
              <Input
                id="linkSite"
                name="linkSite"
                defaultValue={profile?.externalLinks.site ?? ''}
              />
            </FormField>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <SubmitButton />
        </form>
      </FormSectionCard>

      <FormSectionCard
        icon={Share2}
        title="Visibilidade das redes"
        description="Cada link é exibido de forma independente aos demais Irmãos."
        contentClassName="pt-1"
      >
        <VisibilityMiniForm
          group="externalLinks"
          items={[
            {
              key: 'whatsapp',
              label: 'WhatsApp',
              icon: MessageCircle,
              defaultChecked: settings?.externalLinks.whatsapp ?? false,
            },
            {
              key: 'instagram',
              label: 'Instagram',
              icon: Instagram,
              defaultChecked: settings?.externalLinks.instagram ?? false,
            },
            {
              key: 'facebook',
              label: 'Facebook',
              icon: Facebook,
              defaultChecked: settings?.externalLinks.facebook ?? false,
            },
            {
              key: 'linkedin',
              label: 'LinkedIn',
              icon: Linkedin,
              defaultChecked: settings?.externalLinks.linkedin ?? false,
            },
            {
              key: 'lattes',
              label: 'Currículo Lattes',
              icon: GraduationCap,
              defaultChecked: settings?.externalLinks.lattes ?? false,
            },
            {
              key: 'site',
              label: 'Site / portfólio',
              icon: Globe,
              defaultChecked: settings?.externalLinks.site ?? false,
            },
          ]}
        />
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
