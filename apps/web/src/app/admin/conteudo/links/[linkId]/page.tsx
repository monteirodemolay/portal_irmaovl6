import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import {
  setLinkActiveAction,
  updateLinkAction,
} from '@/modules/notification/actions/link-admin-actions';
import { LinkForm } from '@/modules/notification/components/link-form';
import { PublishToggleButton } from '@/components/admin/publish-toggle-button';

export default async function EditLinkPage({ params }: { params: Promise<{ linkId: string }> }) {
  const session = await requirePagePermission('link:update');
  const { linkId } = await params;

  const container = createServerContainer();
  const link = await container.repositories.link.findById(linkId);
  if (!link || link.tenantId !== session.authContext.tenantId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold">Editar Link</h1>
        <PublishToggleButton
          published={link.ativo}
          onToggle={setLinkActiveAction.bind(null, link.id)}
          labels={{ on: 'Ativar', off: 'Desativar' }}
        />
      </div>
      <LinkForm action={updateLinkAction.bind(null, linkId)} link={link} />
    </div>
  );
}
