import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';

export const metadata = {
  title: 'Cartas liberadas | Cripta VL6',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const session = await requireSession();
  const member = await createServerContainer().repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (member?.situacao !== 'ativo' || !canAccessCriptaPilot(session.user.email)) notFound();
  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12 text-[#17263f]">
      <Link href="/cripta/painel" className="text-sm font-semibold text-[#123c69]">
        ← Painel da Cripta
      </Link>
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white">
        <p className="text-xs uppercase tracking-[.2em] text-[#e3bd62]">Cripta · área do irmão</p>
        <h1 className="mt-4 font-serif text-4xl">Minhas cartas liberadas</h1>
      </header>
      <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
        <h2 className="font-serif text-2xl">Cartas da sua conta</h2>
        <p className="mt-2 text-sm leading-6 text-[#5e584c]">
          As cartas atualmente guardadas no Wix podem ser abertas em Minhas cartas, com o seu login.
          A recuperação do arquivo lacrado dos pen drives para esta tela ainda depende da integração
          do ciclo offline.
        </p>
        <Link
          href="/cripta/minhas-cartas"
          className="mt-5 inline-block rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white"
        >
          Abrir Minhas cartas
        </Link>
      </section>
    </div>
  );
}
