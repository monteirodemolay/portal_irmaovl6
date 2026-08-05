import Link from 'next/link';
import { Button } from '@vl6/ui';

const NAV_ITEMS = [
  { href: '/', label: 'Início' },
  { href: '/nossa-loja', label: 'Nossa Loja' },
  { href: '/diretoria', label: 'Diretoria' },
  { href: '/noticias', label: 'Notícias' },
  { href: '/contato', label: 'Contato' },
];

export function PublicHeader({ tenantName }: { tenantName: string }) {
  return (
    <header className="border-border flex items-center justify-between border-b px-6 py-4">
      <Link href="/" className="font-display font-semibold">
        {tenantName}
      </Link>
      <nav className="hidden items-center gap-5 md:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-muted hover:text-foreground text-sm"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <Button asChild size="sm">
        <Link href="/login">Área do Irmão</Link>
      </Button>
    </header>
  );
}
