import { BookOpen, Download, FileText, Image as GalleryIcon } from '@vl6/ui';
import { DashboardSectionHeading } from './dashboard-section-heading';
import { QuickLinkCard, type QuickLinkItem } from './quick-link-card';

// Arquivos, Biblioteca, Galeria e Downloads reunidos sob um único rótulo no
// Dashboard, espelhando o agrupamento da sidebar (`nav-items.tsx`) — mesmo
// racional: são um único espaço para o Irmão (Acervo Digital), ainda que
// continuem sendo entidades/rotas separadas no domínio.
const ACERVO_QUICK_LINKS: QuickLinkItem[] = [
  {
    href: '/arquivos',
    label: 'Documentos',
    description: 'Circulares e documentos oficiais.',
    icon: FileText,
  },
  {
    href: '/biblioteca',
    label: 'Biblioteca',
    description: 'Estudos ao alcance do Irmão.',
    icon: BookOpen,
  },
  {
    href: '/galeria',
    label: 'Fotografias',
    description: 'Registros de momentos especiais.',
    icon: GalleryIcon,
  },
  {
    href: '/downloads',
    label: 'Favoritos',
    description: 'Itens favoritados na Biblioteca.',
    icon: Download,
  },
];

export function AcervoPanel() {
  return (
    <section className="flex flex-col gap-3">
      <DashboardSectionHeading title="Acervo VL6" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ACERVO_QUICK_LINKS.map((item) => (
          <QuickLinkCard key={item.href} item={item} />
        ))}
      </div>
    </section>
  );
}
