import { AdminWorkspaceShell } from '@/components/layout/admin-workspace-shell';

export default function ConteudoLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminWorkspaceShell
      title="Gestão de Acontecimentos"
      description="Notícias, avisos e demais conteúdos vinculados a fatos datados devem ser tratados dentro da Ficha Única. Estas rotas permanecem para manutenção de legado, exceções e conteúdo realmente independente."
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
