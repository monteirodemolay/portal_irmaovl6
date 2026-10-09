import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';

export default function ConteudoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceShell
      title="Gestão de Acontecimentos"
      description="Cadastre o fato uma única vez e conduza, no mesmo ambiente, Agenda, notícia, aviso, comunicação, mídias, Acervo e histórico. Rotas técnicas continuam existindo sem competir com o fluxo principal."
      items={[
        { href: '/admin/publicacoes', label: 'Visão geral', exact: true },
        { href: '/admin/publicacoes/novo', label: 'Novo acontecimento', exact: true },
        { href: '/admin/conteudo/agenda', label: 'Agenda e presença' },
        { href: '/admin/conteudo/noticias', label: 'Notícias' },
        { href: '/admin/conteudo/avisos', label: 'Avisos' },
        { href: '/admin/comunicacao', label: 'Comunicação' },
      ]}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
