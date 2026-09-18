import { LibraryAdminNav } from '@/modules/library/components/library-admin-nav';

export default function BibliotecaAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-5">
      <div className="print:hidden">
        <LibraryAdminNav />
      </div>
      {children}
    </div>
  );
}
