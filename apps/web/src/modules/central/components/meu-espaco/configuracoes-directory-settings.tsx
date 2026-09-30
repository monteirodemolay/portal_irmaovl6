'use client';

import type { PublicationSettings } from '@vl6/domain';
import {
  Briefcase,
  Building2,
  Camera,
  Compass,
  Facebook,
  Globe,
  GraduationCap,
  Handshake,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  UserCircle,
} from '@vl6/ui';
import { VisibilityMiniForm } from './visibility-mini-form';

export function ConfiguracoesDirectorySettings({
  settings,
}: {
  settings: PublicationSettings | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <details className="border-border rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Blocos visíveis do perfil</summary>
        <div className="pt-3">
          <VisibilityMiniForm
            group="blocks"
            items={[
              { key: 'apresentacao', label: 'Apresentação', icon: Sparkles, defaultChecked: settings?.blocks.apresentacao ?? true },
              { key: 'informacoesPessoais', label: 'Informações pessoais', icon: UserCircle, defaultChecked: settings?.blocks.informacoesPessoais ?? true },
              { key: 'profissional', label: 'Profissional', icon: Briefcase, defaultChecked: settings?.blocks.profissional ?? true },
              { key: 'competencias', label: 'Competências', icon: Sparkles, defaultChecked: settings?.blocks.competencias ?? true },
              { key: 'servicos', label: 'Serviços', icon: Sparkles, defaultChecked: settings?.blocks.servicos ?? true },
              { key: 'empresa', label: 'Empresa e negócios', icon: Building2, defaultChecked: settings?.blocks.empresa ?? true },
              { key: 'afiliacoes', label: 'Afiliações', icon: Handshake, defaultChecked: settings?.blocks.afiliacoes ?? true },
              { key: 'informacoesMaconicas', label: 'Informações maçônicas complementares', icon: Compass, defaultChecked: settings?.blocks.informacoesMaconicas ?? true },
              { key: 'endereco', label: 'Endereço', icon: MapPin, defaultChecked: settings?.blocks.endereco ?? true },
              { key: 'memoriaFotografica', label: 'Memória fotográfica', icon: Camera, defaultChecked: settings?.blocks.memoriaFotografica ?? true },
            ]}
          />
        </div>
      </details>

      <details className="border-border rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">Visibilidade dos contatos</summary>
        <div className="pt-3">
          <VisibilityMiniForm
            group="contacts"
            items={[
              { key: 'telefone', label: 'Telefone', icon: Phone, defaultChecked: settings?.contacts.telefone ?? true },
              { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, defaultChecked: settings?.contacts.whatsapp ?? true },
              { key: 'email', label: 'E-mail', icon: Mail, defaultChecked: settings?.contacts.email ?? true },
            ]}
          />
        </div>
      </details>

      <details className="border-border rounded-xl border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Visibilidade das redes e perfis externos
        </summary>
        <div className="pt-3">
          <VisibilityMiniForm
            group="externalLinks"
            items={[
              { key: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, defaultChecked: settings?.externalLinks.whatsapp ?? true },
              { key: 'instagram', label: 'Instagram', icon: Instagram, defaultChecked: settings?.externalLinks.instagram ?? true },
              { key: 'facebook', label: 'Facebook', icon: Facebook, defaultChecked: settings?.externalLinks.facebook ?? true },
              { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, defaultChecked: settings?.externalLinks.linkedin ?? true },
              { key: 'lattes', label: 'Currículo Lattes', icon: GraduationCap, defaultChecked: settings?.externalLinks.lattes ?? true },
              { key: 'site', label: 'Site / portfólio', icon: Globe, defaultChecked: settings?.externalLinks.site ?? true },
            ]}
          />
        </div>
      </details>
    </div>
  );
}
