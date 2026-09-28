import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';

export const metadata = { title: 'Painel da Cripta | Portal VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requireSession();
  const tenantId = session.authContext.tenantId;
  const member = await createServerContainer().repositories.member.findByUserId(tenantId, session.user.id);
  if (member?.situacao !== 'ativo' || !canAccessCriptaPilot(session.user.email)) notFound();
  const db = getAdminFirestore();
  const [open, letters, draft, governance] = await Promise.all([
    isOnlineOpen(tenantId),
    db.collection('criptaOnlineCapsulesV1').where('uid', '==', session.user.id).get(),
    db.collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').doc(session.user.id).get(),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
  ]);
  const count = letters.docs.filter((doc) => doc.data().tenantId === tenantId && doc.data().status === 'ready').length;
  const date = governance.data()?.nextOpeningDate;
  return <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
    <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">Cripta · área do irmão</p>
      <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Estado da Cripta</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-200">Aqui você acompanha suas cartas. Quando a escrita estiver aberta, poderá continuar um rascunho, escrever ou consultar as cartas guardadas em sua conta.</p>
      <p className="mt-6 inline-block rounded-full border border-[#d7b86a] px-4 py-2 text-sm font-semibold">{open ? 'Escrita aberta' : 'Escrita fechada'}</p>
    </header>
    <section className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6"><span className="text-sm text-[#5e584c]">Minhas cartas no Portal</span><strong className="mt-2 block font-serif text-4xl">{count}</strong></div>
      <div className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6"><span className="text-sm text-[#5e584c]">Rascunho</span><strong className="mt-2 block font-serif text-2xl">{draft.exists ? 'Em andamento' : 'Nenhum'}</strong></div>
      <div className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6"><span className="text-sm text-[#5e584c]">Próxima data prevista</span><strong className="mt-2 block font-serif text-2xl">{date ? new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A definir'}</strong></div>
    </section>
    <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6">
      <h2 className="font-serif text-3xl">Minhas cartas</h2>
      <p className="mt-2 text-sm leading-6 text-[#5e584c]">{open ? 'Escreva com calma, salve um rascunho e deposite quando estiver pronto. Você também pode abrir suas cartas já enviadas.' : 'A escrita está fechada. Suas cartas já enviadas continuam disponíveis na conta enquanto estiverem guardadas no Wix.'}</p>
      <Link href="/cripta/minhas-cartas" className="mt-5 inline-block rounded-xl bg-[#123c69] px-6 py-3 font-semibold text-white">{open ? 'Abrir Minhas cartas' : 'Consultar Minhas cartas'}</Link>
    </section>
    <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
      <h2 className="font-serif text-2xl">Comprovante</h2>
      <p className="mt-2 text-sm text-[#5e584c]">Consulte a contagem vinculada à sua conta e imprima o registro atual.</p>
      <Link href="/cripta/comprovante" className="mt-4 inline-block font-semibold text-[#123c69]">Ver comprovante →</Link>
    </section>
    <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6">
      <h2 className="font-serif text-2xl">Cartas liberadas</h2>
      <p className="mt-2 text-sm text-[#5e584c]">Consulte o estado das cartas do seu login e das futuras reaberturas.</p>
      <Link href="/cripta/liberadas" className="mt-4 inline-block font-semibold text-[#123c69]">Ver área de cartas liberadas →</Link>
    </section>
  </div>;
}
