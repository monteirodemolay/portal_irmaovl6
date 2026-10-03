import { requirePagePermission } from '@/lib/auth/require-permission';
import { CriptaLab } from './cripta-lab';

export const metadata = {
  title: 'Laboratório da Cripta | Portal VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  await requirePagePermission('tenant:manage');
  return <CriptaLab />;
}
