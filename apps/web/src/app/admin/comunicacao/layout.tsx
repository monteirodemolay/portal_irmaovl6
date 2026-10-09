import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';

export default function CommunicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceShell
      title="Gestão de Acontecimentos"
      description="A comunicação complementa o acontecimento e não cria uma segunda origem de dados. Publicações vinculadas devem ser produzidas e acompanhadas pela Ficha Única; esta área permanece para modelos e exceções técnicas."
      items={[
        { href: '/admin/publicacoes', label: 'Acontecimentos', exact: true },
        { href: '/admin/publicacoes/novo', label: 'Registrar acontecimento', exact: true },
        { href: '/admin/comunicacao/modelos', label: 'Modelos de comunicação' },
      ]}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
