'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { PublicationSettings } from '@vl6/domain';
import { Badge, Button } from '@vl6/ui';
import {
  updatePublicationSettingsAction,
  withdrawFromDirectoryAction,
  type CentralActionState,
} from '../actions/central-actions';

const BLOCK_LABELS: Record<keyof PublicationSettings['blocks'], string> = {
  apresentacao: 'Apresentação',
  informacoesPessoais: 'Informações pessoais',
  profissional: 'Profissional',
  empresa: 'Empresa e atuação',
  informacoesMaconicas: 'Informações maçônicas complementares',
};

const CONTACT_LABELS: Record<keyof PublicationSettings['contacts'], string> = {
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
};

const LINK_LABELS: Record<keyof PublicationSettings['externalLinks'], string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  lattes: 'Currículo Lattes',
  site: 'Site / portfólio',
};

function Toggle({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-muted text-xs">{defaultChecked ? 'Visível' : '🔒 Privado'}</span>
        <input type="checkbox" name={name} className="h-4 w-4" defaultChecked={defaultChecked} />
      </span>
    </label>
  );
}

export function CentralVisibilityForm({ settings }: { settings: PublicationSettings | null }) {
  const [state, formAction] = useActionState<CentralActionState, FormData>(
    updatePublicationSettingsAction,
    { error: null },
  );

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="border-border rounded-2xl border p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold">Minha publicação na Central</h3>
          <Badge variant={settings?.profilePublished ? 'success' : 'outline'}>
            {settings?.profilePublished ? 'Publicado' : 'Não publicado'}
          </Badge>
        </div>
        <p className="text-muted text-sm">
          Você controla quais informações são disponibilizadas aos demais Irmãos. Informações
          privadas permanecem fora da Central.
        </p>
        {settings?.profilePublished && (
          <form action={withdrawFromDirectoryAction} className="mt-4">
            <Button type="submit" variant="destructive" size="sm">
              Retirar meu perfil da Central
            </Button>
          </form>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-6">
        <fieldset>
          <legend className="font-display mb-2 text-sm font-semibold">Blocos do perfil</legend>
          <div className="divide-border divide-y">
            {(Object.keys(BLOCK_LABELS) as Array<keyof typeof BLOCK_LABELS>).map((key) => (
              <Toggle
                key={key}
                name={`blocks.${key}`}
                label={BLOCK_LABELS[key]}
                defaultChecked={settings?.blocks[key] ?? false}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display mb-2 text-sm font-semibold">Contatos</legend>
          <div className="divide-border divide-y">
            {(Object.keys(CONTACT_LABELS) as Array<keyof typeof CONTACT_LABELS>).map((key) => (
              <Toggle
                key={key}
                name={`contacts.${key}`}
                label={CONTACT_LABELS[key]}
                defaultChecked={settings?.contacts[key] ?? false}
              />
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-display mb-2 text-sm font-semibold">
            Redes e perfis externos
          </legend>
          <div className="divide-border divide-y">
            {(Object.keys(LINK_LABELS) as Array<keyof typeof LINK_LABELS>).map((key) => (
              <Toggle
                key={key}
                name={`externalLinks.${key}`}
                label={LINK_LABELS[key]}
                defaultChecked={settings?.externalLinks[key] ?? false}
              />
            ))}
          </div>
        </fieldset>

        <p className="text-muted text-xs">
          Ativar um item aqui é um consentimento explícito para disponibilizá-lo aos demais Irmãos
          da Loja — você pode desligar a qualquer momento.
        </p>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-fit">
      {pending ? 'Salvando…' : 'Salvar visibilidade'}
    </Button>
  );
}
