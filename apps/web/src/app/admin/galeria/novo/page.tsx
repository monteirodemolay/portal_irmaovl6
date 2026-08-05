import { requirePagePermission } from '@/lib/auth/require-permission';
import { GalleryAlbumForm } from '@/modules/gallery/components/gallery-album-form';

export default async function NewGalleryAlbumPage() {
  await requirePagePermission('gallery:create');

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Novo Álbum</h1>
      <GalleryAlbumForm />
    </div>
  );
}
