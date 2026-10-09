import { redirect } from 'next/navigation';

export default async function LibraryItemPage({
  params,
}: {
  params: Promise<{ libraryItemId: string }>;
}) {
  const { libraryItemId } = await params;
  redirect(`/admin/acervo/biblioteca/${encodeURIComponent(libraryItemId)}/editar`);
}
