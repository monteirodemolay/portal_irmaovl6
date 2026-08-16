import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { AcervoPageHeader } from '@/components/member/acervo-page-header';
import { ArchiveItemContent } from '@/modules/archive/components/archive-item-content';
import { resolveArchiveItem } from '@/modules/archive/lib/resolve-archive-item';

export default async function ArchiveItemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;

  const container = createServerContainer();
  const item = await resolveArchiveItem(id, session.authContext, container);
  if (!item) notFound();

  return (
    <div className="flex flex-col gap-6">
      <AcervoPageHeader title="Item do Acervo" backHref="/acervo" />
      <ArchiveItemContent item={item} />
    </div>
  );
}
