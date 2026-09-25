import { requirePagePermission } from '@/lib/auth/require-permission';
import { CriptaDemonstracao } from './cripta-demonstracao';

export const metadata = {
  title: 'Cripta · demonstração | Portal do Irmão VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  await requirePagePermission('tenant:manage');
  return <CriptaDemonstracao />;
}
