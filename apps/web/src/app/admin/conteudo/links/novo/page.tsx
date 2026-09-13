import { requirePagePermission } from '@/lib/auth/require-permission';
import { createLinkAction } from '@/modules/notification/actions/link-admin-actions';
import { LinkForm } from '@/modules/notification/components/link-form';

export default async function NewLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ titulo?: string; url?: string; descricao?: string }>;
}) {
  await requirePagePermission('link:create');
  const { titulo, url, descricao } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Link</h1>
      <LinkForm action={createLinkAction} prefill={{ titulo, url, descricao }} />
    </div>
  );
}
