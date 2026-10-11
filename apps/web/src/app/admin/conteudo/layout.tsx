import { AdminAreaWorkspace } from '@/components/layout/admin-area-workspace';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminAreaWorkspace area="acontecimentos">{children}</AdminAreaWorkspace>;
}
