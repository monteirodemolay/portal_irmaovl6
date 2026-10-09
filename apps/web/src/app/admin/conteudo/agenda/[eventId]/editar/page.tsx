import { redirect } from 'next/navigation';

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/admin/publicacoes/${encodeURIComponent(eventId)}#dados`);
}
