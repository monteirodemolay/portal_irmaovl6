import { redirect } from 'next/navigation';
import { requirePagePermission } from '@/lib/auth/require-permission';
export default async function LegacyPage() {
  await requirePagePermission('tenant:manage');
  redirect('/admin/cripta/demonstracao');
}
