'use client';

import type { PublicationSettings } from '@vl6/domain';
import {
  Briefcase,
  Building2,
  Button,
  CheckCircle2,
  Compass,
  EyeOff,
  MapPin,
  Quote,
  Sparkles,
  UserCircle,
} from '@vl6/ui';
import { FormSectionCard } from '@/components/forms/section-card';
import { withdrawFromDirectoryAction } from '../../actions/central-actions';
import { VisibilityMiniForm } from './visibility-mini-form';

export function PrivacidadeTab({ settings }: { settings: PublicationSettings | null }) {
  const published = settings?.profilePublished ?? false;

  return (
    <div className="flex flex-col gap-4">
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
                : 'Ative pelo menos um bloco abaixo para aparecer no Diretório.'}
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

      <FormSectionCard
        icon={Sparkles}
        title="Blocos do perfil"
        description="Cada bloco corresponde a um conjunto de conteúdo das outras abas."
        contentClassName="pt-1"
      >
        <VisibilityMiniForm
          group="blocks"
          items={[
            {
              key: 'apresentacao',
              label: 'Apresentação',
              icon: Quote,
              defaultChecked: settings?.blocks.apresentacao ?? false,
            },
            {
              key: 'informacoesPessoais',
              label: 'Informações pessoais',
              icon: UserCircle,
              defaultChecked: settings?.blocks.informacoesPessoais ?? false,
            },
            {
              key: 'profissional',
              label: 'Profissional',
              icon: Briefcase,
              defaultChecked: settings?.blocks.profissional ?? false,
            },
            {
              key: 'competencias',
              label: 'Competências',
              icon: Sparkles,
              defaultChecked: settings?.blocks.competencias ?? false,
            },
            {
              key: 'servicos',
              label: 'Serviços',
              icon: Sparkles,
              defaultChecked: settings?.blocks.servicos ?? false,
            },
            {
              key: 'empresa',
              label: 'Empresa e negócios',
              icon: Building2,
              defaultChecked: settings?.blocks.empresa ?? false,
            },
            {
              key: 'informacoesMaconicas',
              label: 'Informações maçônicas complementares',
              icon: Compass,
              defaultChecked: settings?.blocks.informacoesMaconicas ?? false,
            },
            {
              key: 'endereco',
              label: 'Endereço',
              icon: MapPin,
              defaultChecked: settings?.blocks.endereco ?? false,
            },
          ]}
        />
      </FormSectionCard>

      <p className="text-muted text-xs">
        As visibilidades de Contatos e de Redes têm painel próprio, nas abas &ldquo;Contatos&rdquo;
        e &ldquo;Redes&rdquo;. Ativar um item é um consentimento explícito para disponibilizá-lo aos
        demais Irmãos da Loja — você pode desligar a qualquer momento.
      </p>
    </div>
  );
}
