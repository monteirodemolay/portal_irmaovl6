import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { notFound } from 'next/navigation';
import { CriptaDemonstracao } from './cripta-demonstracao';

export const metadata = {
  title: 'Cripta · demonstração | Portal do Irmão VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  return <CriptaDemonstracao />;
}
