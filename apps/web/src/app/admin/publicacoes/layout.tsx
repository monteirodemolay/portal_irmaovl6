import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';

export default function PublicacoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceShell
      title="Gestão de Acontecimentos"
      description="Cadastre o fato uma única vez e conduza, no mesmo ambiente, comunicação, mídias, Acervo, relacionamentos, presença, histórico e ações administrativas."
      items={[
        { href: '/admin/publicacoes', label: 'Visão geral', exact: true },
        { href: '/admin/publicacoes/novo', label: 'Novo acontecimento', exact: true },
        { href: '/admin/conteudo/agenda', label: 'Agenda e presença' },
        { href: '/admin/comunicacao', label: 'Comunicação' },
      ]}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
