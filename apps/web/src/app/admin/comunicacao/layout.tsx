import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';

export default function CommunicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceShell
      title="Gestão de Acontecimentos"
      description="Cadastre o fato uma única vez e conduza, no mesmo ambiente, Agenda, notícia, aviso, comunicação, mídias, Acervo e histórico. A Comunicação complementa o acontecimento; não cria uma segunda origem de dados."
      items={[
        { href: '/admin/publicacoes', label: 'Visão geral', exact: true },
        { href: '/admin/publicacoes/novo', label: 'Novo acontecimento', exact: true },
        { href: '/admin/conteudo/agenda', label: 'Agenda e presença' },
        { href: '/admin/conteudo/noticias', label: 'Notícias' },
        { href: '/admin/conteudo/avisos', label: 'Avisos' },
        { href: '/admin/comunicacao', label: 'Comunicação' },
        { href: '/admin/comunicacao/modelos', label: 'Modelos' },
      ]}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
