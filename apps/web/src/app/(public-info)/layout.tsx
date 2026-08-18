import Link from 'next/link';
import { Compass } from '@vl6/ui';

const links = [
  { href: '/sobre-o-portal', label: 'Sobre o Portal' },
  { href: '/minha-agenda', label: 'Minha Agenda' },
  { href: '/privacidade', label: 'Privacidade' },
  { href: '/termos-de-uso', label: 'Termos de Uso' },
  { href: '/suporte', label: 'Suporte' },
] as const;

export default function PublicInfoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="from-primary to-primary-dark border-accent/20 border-b bg-gradient-to-r text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/login" className="flex items-center gap-3">
            <span className="border-accent/40 bg-accent/10 text-accent flex h-11 w-11 items-center justify-center rounded-full border">
              <Compass size={20} />
            </span>
            <span>
              <strong className="font-display block text-lg font-semibold">Portal do Irmão</strong>
              <small className="block text-[10px] uppercase tracking-[0.16em] text-white/60">
                Loja Maçônica Verdadeira Luz nº 06
              </small>
            </span>
          </Link>
          <Link
            href="/login"
            className="border-accent/35 text-accent hover:bg-accent/10 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors"
          >
            Acessar o Portal
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>

      <footer className="border-border bg-surface border-t">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
          <nav aria-label="Informações institucionais" className="mb-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="text-muted hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
            <a
              href="https://www.vl6.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted hover:text-primary inline-flex items-center gap-1 transition-colors"
            >
              Site da Loja
            </a>
          </nav>
          <p className="text-muted text-xs leading-6">
            © 2026 Loja Maçônica Verdadeira Luz nº 06. Todos os direitos reservados.
            <br />
            Rua Raul Seabra, nº 71, Centro, Rio Verde – GO, CEP 75.901-300.
          </p>
        </div>
      </footer>
    </div>
  );
}
