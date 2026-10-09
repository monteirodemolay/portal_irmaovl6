import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';

export default function PublicacoesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceShell
      title="Gestão de Acontecimentos"
      description="O Calendário registra o fato. A Ficha Única concentra notícia, aviso, comunicação, mídias, Acervo, pessoas, presença, histórico e ações administrativas sem duplicar cadastros."
      items={[
        { href: '/admin/publicacoes', label: 'Acontecimentos', exact: true },
        { href: '/admin/publicacoes/novo', label: 'Registrar acontecimento', exact: true },
        { href: '/admin/conteudo/agenda', label: 'Calendário e presença' },
      ]}
    >
      {children}
    </AdminWorkspaceShell>
  );
}
