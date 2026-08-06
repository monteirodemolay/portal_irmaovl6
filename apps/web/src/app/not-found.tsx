import Link from 'next/link';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

/**
 * Sem este arquivo, `notFound()` chamado a partir do layout raiz (quando o
 * host não resolve pra nenhum tenant — ex.: domínio customizado ainda não
 * verificado) renderizava em branco em produção, sem nenhuma mensagem.
 */
export default async function NotFound() {
  const current = await getCurrentTenant();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl font-semibold">
        {current ? 'Página não encontrada' : 'Domínio não configurado'}
      </h1>
      <p className="text-muted max-w-md text-sm">
        {current
          ? 'A página que você procura não existe ou foi movida.'
          : 'Este domínio ainda não está vinculado a nenhuma Loja no Portal do Irmão.'}
      </p>
      <Link href="/" className="text-accent text-sm underline">
        Voltar ao início
      </Link>
    </main>
  );
}
