'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import type { PublicationSettings } from '@vl6/domain';
import {
  Briefcase,
  Building2,
  Button,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Facebook,
  GraduationCap,
  Globe,
  Instagram,
  Linkedin,
  Lock,
  Mail,
  MessageCircle,
  Phone,
  Quote,
  Share2,
  Switch,
  UserCircle,
} from '@vl6/ui';
import { FormSectionCard } from '@/components/forms/section-card';
import {
  updatePublicationSettingsAction,
  withdrawFromDirectoryAction,
  type CentralActionState,
} from '../actions/central-actions';

type IconType = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const BLOCK_LABELS: Record<keyof PublicationSettings['blocks'], string> = {
  apresentacao: 'Apresentação',
  informacoesPessoais: 'Informações pessoais',
  profissional: 'Profissional',
  empresa: 'Empresa e atuação',
  informacoesMaconicas: 'Informações maçônicas complementares',
};

const BLOCK_ICONS: Record<keyof PublicationSettings['blocks'], IconType> = {
  apresentacao: Quote,
  informacoesPessoais: UserCircle,
  profissional: Briefcase,
  empresa: Building2,
  informacoesMaconicas: Compass,
};

const CONTACT_LABELS: Record<keyof PublicationSettings['contacts'], string> = {
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
};

const CONTACT_ICONS: Record<keyof PublicationSettings['contacts'], IconType> = {
  telefone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
};

const LINK_LABELS: Record<keyof PublicationSettings['externalLinks'], string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  lattes: 'Currículo Lattes',
  site: 'Site / portfólio',
};

const LINK_ICONS: Record<keyof PublicationSettings['externalLinks'], IconType> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
  lattes: GraduationCap,
  site: Globe,
};

function ToggleRow({
  name,
  label,
  icon: Icon,
  defaultChecked,
}: {
  name: string;
  label: string;
  icon: IconType;
  defaultChecked: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <label className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon size={16} strokeWidth={1.75} className="text-muted shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2.5">
        <span
          className={
            checked
              ? 'text-primary flex items-center gap-1 text-xs font-medium'
              : 'text-muted flex items-center gap-1 text-xs'
          }
        >
          {checked ? <Eye size={13} /> : <Lock size={13} />}
          {checked ? 'Visível' : 'Privado'}
        </span>
        <Switch
          name={name}
          defaultChecked={defaultChecked}
          onChange={(event) => setChecked(event.target.checked)}
          aria-label={label}
        />
      </span>
    </label>
  );
}

export function CentralVisibilityForm({ settings }: { settings: PublicationSettings | null }) {
  const [state, formAction] = useActionState<CentralActionState, FormData>(
    updatePublicationSettingsAction,
    { error: null },
  );
  const published = settings?.profilePublished ?? false;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={
          published
            ? 'flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between'
            : 'border-border bg-background flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between'
        }
      >
        <div className="flex items-center gap-3">
          <span
            className={
              published
                ? 'flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'
                : 'bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full'
            }
          >
            {published ? <CheckCircle2 size={22} /> : <EyeOff size={20} />}
          </span>
          <div>
            <p className="font-display text-sm font-semibold">
              {published ? 'Seu perfil está publicado' : 'Seu perfil ainda não está publicado'}
            </p>
            <p className="text-muted text-sm">
              {published
                ? 'Os blocos ativados abaixo estão visíveis aos demais Irmãos da Loja.'
                : 'Ative pelo menos um bloco abaixo para aparecer na Central VL6.'}
            </p>
          </div>
        </div>
        {published && (
          <form action={withdrawFromDirectoryAction}>
            <Button type="submit" variant="destructive" size="sm">
              <EyeOff size={14} />
              Retirar da Central
            </Button>
          </form>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-6">
        <FormSectionCard
          icon={Eye}
          title="Blocos do perfil"
          description="Cada bloco corresponde ao conteúdo preenchido acima."
          contentClassName="divide-border divide-y gap-0 pt-1"
        >
          {(Object.keys(BLOCK_LABELS) as Array<keyof typeof BLOCK_LABELS>).map((key) => (
            <ToggleRow
              key={key}
              name={`blocks.${key}`}
              label={BLOCK_LABELS[key]}
              icon={BLOCK_ICONS[key]}
              defaultChecked={settings?.blocks[key] ?? false}
            />
          ))}
        </FormSectionCard>

        <FormSectionCard
          icon={Phone}
          title="Contatos"
          contentClassName="divide-border divide-y gap-0 pt-1"
        >
          {(Object.keys(CONTACT_LABELS) as Array<keyof typeof CONTACT_LABELS>).map((key) => (
            <ToggleRow
              key={key}
              name={`contacts.${key}`}
              label={CONTACT_LABELS[key]}
              icon={CONTACT_ICONS[key]}
              defaultChecked={settings?.contacts[key] ?? false}
            />
          ))}
        </FormSectionCard>

        <FormSectionCard
          icon={Share2}
          title="Redes e perfis externos"
          contentClassName="divide-border divide-y gap-0 pt-1"
        >
          {(Object.keys(LINK_LABELS) as Array<keyof typeof LINK_LABELS>).map((key) => (
            <ToggleRow
              key={key}
              name={`externalLinks.${key}`}
              label={LINK_LABELS[key]}
              icon={LINK_ICONS[key]}
              defaultChecked={settings?.externalLinks[key] ?? false}
            />
          ))}
        </FormSectionCard>

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
