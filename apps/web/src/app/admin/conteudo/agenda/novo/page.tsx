import { redirect } from 'next/navigation';

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const suffix = tipo ? `?tipo=${encodeURIComponent(tipo)}` : '';
  redirect(`/admin/publicacoes/novo${suffix}`);
}
