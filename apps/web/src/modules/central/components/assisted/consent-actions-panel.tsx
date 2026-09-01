'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import type { CentralBlockKey, PublicationConsent, PublicationSettings } from '@vl6/domain';
import { Badge, Button, CheckCircle2, EyeOff, Select, Textarea } from '@vl6/ui';
import { FormField } from '@/components/forms/form-field';
import { CollapsibleSection } from '@/components/forms/collapsible-section';
import {
  publishMemberProfileBlocksAction,
  recordMemberProfileConsentAction,
  revokeMemberProfileConsentAction,
  type AdminCentralActionState,
} from '../../actions/admin-central-actions';

const BLOCK_LABELS: Record<CentralBlockKey, string> = {
  apresentacao: 'Apresentação',
  informacoesPessoais: 'Informações pessoais',
  profissional: 'Profissional',
  empresa: 'Empresa e negócios',
  informacoesMaconicas: 'Informações maçônicas complementares',
  competencias: 'Competências',
  servicos: 'Serviços',
  endereco: 'Endereço',
  memoriaFotografica: 'Memória fotográfica',
};
const CONTACT_LABELS: Record<string, string> = {
  telefone: 'Telefone',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
};
const LINK_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  lattes: 'Currículo Lattes',
  site: 'Site / portfólio',
};

/** Estado atual (autorizado agora ou não) de `key`, a partir do histórico mais recente primeiro. */
function currentlyAuthorized(
  key: string,
  group: 'blocksAuthorized' | 'contactsAuthorized' | 'externalLinksAuthorized',
  history: PublicationConsent[],
): boolean {
  for (const entry of history) {
    if ((entry[group] as string[]).includes(key)) return entry.action === 'grant';
  }
  return false;
}

function CheckboxMatrix({
  prefix,
  history,
  group,
  labels,
  publishedState,
}: {
  prefix: string;
  history: PublicationConsent[];
  group: 'blocksAuthorized' | 'contactsAuthorized' | 'externalLinksAuthorized';
  labels: Record<string, string>;
  /** true = já visível hoje no perfil (blocks/contacts/links atuais de PublicationSettings). */
  publishedState: Record<string, boolean>;
}) {
  return (
    <div className="divide-border flex flex-col divide-y">
      {Object.entries(labels).map(([key, label]) => {
        const authorized = currentlyAuthorized(key, group, history);
        const published = publishedState[key] ?? false;
        return (
          <label key={key} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <input type="checkbox" name={`${prefix}.${key}`} className="accent-primary" />
              {label}
            </span>
            <span className="flex items-center gap-1.5">
              {published && (
                <Badge variant="success" className="text-[10px]">
                  Publicado
                </Badge>
              )}
              {authorized && !published && (
                <Badge variant="outline" className="text-[10px]">
                  Autorizado
                </Badge>
              )}
            </span>
          </label>
        );
      })}
    </div>
  );
}

/**
 * Seção 7 — "Privacidade e consentimento" do editor assistido. Três ações
 * distintas e deliberadamente separadas (nunca uma única "publicar tudo"):
 * registrar consentimento (grava o aceite, não muda visibilidade), publicar
 * blocos já autorizados (só funciona se o consentimento existir — o Use Case
 * rejeita senão) e revogar (esconde na hora). Todo consentimento gravado
 * aqui é sempre `assisted_admin` — o Use Case nem aceita `source` como
 * input.
 */
export function ConsentActionsPanel({
  memberId,
  settings,
  consentHistory,
}: {
  memberId: string;
  settings: PublicationSettings | null;
  consentHistory: PublicationConsent[];
}) {
  const boundRecord = recordMemberProfileConsentAction.bind(null, memberId);
  const boundPublish = publishMemberProfileBlocksAction.bind(null, memberId);
  const boundRevoke = revokeMemberProfileConsentAction.bind(null, memberId);
  const [recordState, recordAction] = useActionState<AdminCentralActionState, FormData>(
    boundRecord,
    { error: null },
  );
  const [publishState, publishAction] = useActionState<AdminCentralActionState, FormData>(
    boundPublish,
    { error: null },
  );
  const [revokeState, revokeAction] = useActionState<AdminCentralActionState, FormData>(
    boundRevoke,
    { error: null },
  );

  const published = settings?.profilePublished ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={
          published
            ? 'flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4'
            : 'border-border bg-surface flex items-center gap-3 rounded-2xl border p-4'
        }
      >
        <span
          className={
            published
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700'
              : 'bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full'
          }
        >
          {published ? <CheckCircle2 size={18} /> : <EyeOff size={16} />}
        </span>
        <p className="text-sm font-medium">
          {published
            ? 'Este perfil tem pelo menos um bloco visível no Diretório.'
            : 'Nenhum bloco publicado ainda — o cadastro assistido continua como rascunho.'}
        </p>
      </div>

      <CollapsibleSection
        icon={CheckCircle2}
        title="Registrar consentimento"
        description="Confirme com o Irmão o que ele autoriza publicar, e como isso foi confirmado."
      >
        <form action={recordAction} className="flex flex-col gap-4">
          <FormField label="Como o consentimento foi confirmado" htmlFor="confirmationChannel">
            <Select id="confirmationChannel" name="confirmationChannel" defaultValue="">
              <option value="" disabled>
                Selecione
              </option>
              <option value="presencial">Presencial</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telefone">Telefone</option>
              <option value="email">E-mail</option>
              <option value="formulario_impresso">Formulário impresso</option>
            </Select>
          </FormField>
          <p className="text-muted text-xs font-semibold uppercase tracking-wide">
            Itens autorizados nesta confirmação
          </p>
          <CheckboxMatrix
            prefix="blocks"
            history={consentHistory}
            group="blocksAuthorized"
            labels={BLOCK_LABELS}
            publishedState={(settings?.blocks ?? {}) as Record<string, boolean>}
          />
          <CheckboxMatrix
            prefix="contacts"
            history={consentHistory}
            group="contactsAuthorized"
            labels={CONTACT_LABELS}
            publishedState={(settings?.contacts ?? {}) as Record<string, boolean>}
          />
          <CheckboxMatrix
            prefix="externalLinks"
            history={consentHistory}
            group="externalLinksAuthorized"
            labels={LINK_LABELS}
            publishedState={(settings?.externalLinks ?? {}) as Record<string, boolean>}
          />
          <FormField label="Observação (opcional)" htmlFor="note">
            <Textarea
              id="note"
              name="note"
              rows={2}
              placeholder="Ex.: confirmado por áudio no grupo da Loja em 05/03."
            />
          </FormField>
          {recordState.error && <p className="text-sm text-red-600">{recordState.error}</p>}
          <SubmitButton label="Registrar consentimento" />
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        icon={CheckCircle2}
        title="Publicar blocos autorizados"
        description="Só funciona para itens com consentimento vigente — os demais permanecem ocultos."
      >
        <form action={publishAction} className="flex flex-col gap-4">
          <CheckboxMatrix
            prefix="blocks"
            history={consentHistory}
            group="blocksAuthorized"
            labels={BLOCK_LABELS}
            publishedState={(settings?.blocks ?? {}) as Record<string, boolean>}
          />
          <CheckboxMatrix
            prefix="contacts"
            history={consentHistory}
            group="contactsAuthorized"
            labels={CONTACT_LABELS}
            publishedState={(settings?.contacts ?? {}) as Record<string, boolean>}
          />
          <CheckboxMatrix
            prefix="externalLinks"
            history={consentHistory}
            group="externalLinksAuthorized"
            labels={LINK_LABELS}
            publishedState={(settings?.externalLinks ?? {}) as Record<string, boolean>}
          />
          {publishState.error && <p className="text-sm text-red-600">{publishState.error}</p>}
          <SubmitButton label="Publicar selecionados" />
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        icon={EyeOff}
        title="Revogar e esconder"
        description="Esconde imediatamente os itens marcados e grava o motivo."
      >
        <form action={revokeAction} className="flex flex-col gap-4">
          <CheckboxMatrix
            prefix="blocks"
            history={consentHistory}
            group="blocksAuthorized"
            labels={BLOCK_LABELS}
            publishedState={(settings?.blocks ?? {}) as Record<string, boolean>}
          />
          <CheckboxMatrix
            prefix="contacts"
            history={consentHistory}
            group="contactsAuthorized"
            labels={CONTACT_LABELS}
            publishedState={(settings?.contacts ?? {}) as Record<string, boolean>}
          />
          <CheckboxMatrix
            prefix="externalLinks"
            history={consentHistory}
            group="externalLinksAuthorized"
            labels={LINK_LABELS}
            publishedState={(settings?.externalLinks ?? {}) as Record<string, boolean>}
          />
          <FormField label="Motivo (opcional)" htmlFor="revoke-note">
            <Textarea id="revoke-note" name="note" rows={2} />
          </FormField>
          {revokeState.error && <p className="text-sm text-red-600">{revokeState.error}</p>}
          <SubmitButton label="Revogar selecionados" variant="destructive" />
        </form>
      </CollapsibleSection>
    </div>
  );
}

function SubmitButton({ label, variant }: { label: string; variant?: 'destructive' }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size="sm" className="w-fit" disabled={pending}>
      {pending ? 'Salvando…' : label}
    </Button>
  );
}
