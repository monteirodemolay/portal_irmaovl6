import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { appointCustodians } from './appoint-custodians';
import { UnitCheck } from './unit-check';

export const metadata = { title: 'Administração da Cripta | Portal VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();
  const [result, governance] = await Promise.all([
    container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
  ]);
  const members = result.items;
  const eligible = members.filter((member) => !!member.userId);
  const records = await Promise.all(eligible.map(async (member) => {
    const inventory = await db.collection('criptaOnlineCapsulesV1').where('uid', '==', member.userId!).get();
    return { member, count: inventory.docs.filter((item) => item.data().tenantId === tenantId && item.data().status === 'ready').length };
  }));
  const control = governance.data();
  const name = (id: string | undefined) => members.find((member) => member.id === id)?.nomeCompleto ?? 'Não indicado';
  const field = 'mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 text-[#142a43]';

  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <header className="rounded-[2rem] border border-[#c9a449]/50 bg-[#0a2547] p-8 text-white sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e3bd62]">Cripta · gestão</p>
      <h1 className="mt-4 font-serif text-4xl">Administração da Cripta</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-200">Responsáveis, participação e guarda em um único lugar. Esta área registra metadados; não exibe cartas ou anexos.</p>
    </header>
    <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
      <h2 className="font-serif text-2xl text-[#142a43]">Responsáveis pela abertura</h2>
      <p className="mt-2 text-sm text-[#536074]">Venerável Mestre: {name(control?.masterId)} · Segundo responsável: {name(control?.secondId)}</p>
      <p className="mt-1 text-sm text-[#536074]">Referência da sessão: {control?.minutes ?? 'Pendente'}</p>
      <form action={appointCustodians} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Venerável Mestre<select name="masterId" required defaultValue={control?.masterId ?? ''} className={field}><option value="">Selecione</option>{eligible.map((member) => <option key={member.id} value={member.id}>{member.nomeCompleto}</option>)}</select></label>
        <label className="text-sm font-semibold">Segundo responsável<select name="secondId" required defaultValue={control?.secondId ?? ''} className={field}><option value="">Selecione</option>{eligible.map((member) => <option key={member.id} value={member.id}>{member.nomeCompleto}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Ata ou referência da sessão<input name="minutes" required minLength={5} maxLength={160} defaultValue={control?.minutes ?? ''} placeholder="Ex.: Ata 123/2026" className={field} /></label>
        <button className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white sm:col-span-2 sm:justify-self-start">Registrar indicação</button>
      </form>
      <p className="mt-4 text-sm text-[#725624]">A indicação é registrada com autoria e data. Ela não concede acesso aos arquivos nem substitui a chave física e a dupla aprovação.</p>
    </section>
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <h2 className="font-serif text-2xl text-[#142a43]">Participação dos irmãos Ativos</h2>
      <p className="mt-2 text-sm text-[#536074]">{members.length} Ativos cadastrados · {eligible.length} com conta vinculada · {records.filter((record) => record.count > 0).length} com pacote no acervo permanente</p>
      {result.hasMore && <p className="mt-2 text-sm text-amber-800">A lista ultrapassa 100 irmãos; complete a paginação antes de usá-la como inventário oficial.</p>}
      <div className="mt-5 divide-y">{records.map(({ member, count }) => <div key={member.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{member.nomeCompleto}</span><strong>{count ? `${count} pacote(s) confirmado(s)` : 'Ainda não enviou'}</strong></div>)}</div>
      {members.length > eligible.length && <p className="mt-3 text-sm text-amber-800">Irmãos sem conta vinculada não podem enviar; regularize os acessos antes da abertura.</p>}
    </section>
    <UnitCheck />
    <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
      <h2 className="font-serif text-2xl text-[#142a43]">Unidades de guarda</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">O vínculo de pen drive ou SSD exige exportação, leitura de volta, comparação criptográfica e registro dos custodiantes. Ainda não há unidade conferida. Não retire o conteúdo do Wix antes dessas etapas.</p>
      <button type="button" disabled className="mt-4 rounded-xl border border-[#a78648] px-5 py-3 text-sm font-semibold opacity-60">Vincular unidades · aguardando conferência local</button>
    </section>
  </div>;
}
