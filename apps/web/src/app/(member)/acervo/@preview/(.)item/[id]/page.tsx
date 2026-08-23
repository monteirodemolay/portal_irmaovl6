import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { ArchiveItemContent } from '@/modules/archive/components/archive-item-content';
import { ArchiveItemPreviewShell } from '@/modules/archive/components/archive-item-preview-shell';
import { resolveArchiveItem } from '@/modules/archive/lib/resolve-archive-item';

export default async function ArchiveItemPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  const container = createServerContainer();
  const item = await resolveArchiveItem(id, session.authContext, container, session.role);
  if (!item) notFound();

  return (
    <ArchiveItemPreviewShell titulo={item.titulo}>
      <ArchiveItemContent item={item} />
    </ArchiveItemPreviewShell>
  );
}
