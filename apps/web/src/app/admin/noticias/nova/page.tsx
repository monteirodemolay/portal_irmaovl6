import { requirePagePermission } from '@/lib/auth/require-permission';
import { createNewsAction } from '@/modules/content/actions/content-actions';
import { NewsForm } from '@/modules/content/components/news-form';

export default async function NewNewsPage() {
  await requirePagePermission('news:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Nova Notícia</h1>
      <NewsForm action={createNewsAction} />
    </div>
  );
}
