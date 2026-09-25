import { notFound } from 'next/navigation';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { CriptaExperience } from './cripta-experience';

export const metadata = {
  title: 'Minha Cripta | Portal VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  return <CriptaExperience />;
}
