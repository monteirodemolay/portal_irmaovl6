import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { PrintButton } from './print-button';

export const metadata = { title: 'Comprovante | Cripta VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requireSession();
  const tenantId = session.authContext.tenantId;
  const member = await createServerContainer().repositories.member.findByUserId(tenantId, session.user.id);
  if (member?.situacao !== 'ativo' || !canAccessCriptaPilot(session.user.email)) notFound();
  const letters = await getAdminFirestore().collection('criptaOnlineCapsulesV1').where('uid', '==', session.user.id).get();
  const own = letters.docs.filter((doc) => doc.data().tenantId === tenantId && doc.data().status === 'ready');
  return <div className="mx-auto max-w-3xl space-y-6 pb-12 text-[#17263f]">
    <Link href="/cripta/painel" className="text-sm font-semibold text-[#123c69] print:hidden">← Painel da Cripta</Link>
    <article className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-8 print:border-0 print:p-0">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#8a6a1f]">Loja Verdadeira Luz nº 6</p>
      <h1 className="mt-4 font-serif text-4xl">Comprovante de cartas no Portal</h1>
      <p className="mt-4 text-sm leading-6">Irmão: <strong>{member.nomeCompleto}</strong></p>
      <p className="mt-1 text-sm">Emitido em {new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
      <p className="mt-5 text-lg"><strong>{own.length}</strong> carta(s) vinculada(s) à conta.</p>
      <ul className="mt-5 divide-y border-y border-[#d8c8a4]">{own.map((doc) => <li key={doc.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>Código {doc.id}</span><span>{new Date(doc.data().createdAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</span></li>)}</ul>
      <p className="mt-6 text-xs leading-5 text-[#5e584c]">Este comprovante registra somente os metadados encontrados no Portal na data indicada. A confirmação da guarda física depende da lacração e conferência das unidades externas.</p>
    </article>
    <PrintButton />
  </div>;
}
