import { redirect, notFound } from 'next/navigation';
import { requirePagePermission } from '@/lib/auth/require-permission';
export default async function LegacyCriptaPage({
  params,
  searchParams,
}: {
  params: Promise<{ path?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePagePermission('tenant:manage');
  const { path = [] } = await params;
  if (
    path.length > 1 ||
    !['inauguracao', 'lacracao', 'reabertura', 'abertura-individual'].includes(
      path[0] ?? 'inauguracao',
    )
  )
    notFound();
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value])
      query.append(key, item);
  }
  redirect(
    '/admin/cripta' +
      (path.length ? '/' + path.map(encodeURIComponent).join('/') : '') +
      (query.size ? '?' + query.toString() : ''),
  );
}
