import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { appointCustodians } from './appoint-custodians';
import { UnitCheck } from './unit-check';
import { OnlineOpeningControl } from './online-opening-control';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { SealPanel } from './seal-panel';

export const metadata = { title: 'Administração da Cripta | Portal VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();
  const [result, governance, onlineOpen, currentMaster] = await Promise.all([
    container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    isOnlineOpen(tenantId),
    currentCriptaMaster(tenantId),
  ]);
  const members = result.items;
  const eligible = members.filter((member) => !!member.userId);
  const records = await Promise.all(eligible.map(async (member) => {
    const [inventory, draft] = await Promise.all([
      db.collection('criptaOnlineCapsulesV1').where('uid', '==', member.userId!).get(),
      db.collection('criptaOnlineDraftsV1').doc(tenantId).collection('users').doc(member.userId!).get(),
    ]);
    return { member, hasDraft: draft.exists,
      count: inventory.docs.filter((item) => item.data().tenantId === tenantId && item.data().status === 'ready').length };
  }));
  const control = governance.data();
  const name = (id: string | undefined) => members.find((member) => member.id === id)?.nomeCompleto ?? 'Não indicado';
  const field = 'mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 text-[#142a43]';
  const history = await governance.ref.collection('events').orderBy('at', 'desc').limit(6).get();

  return <div className="mx-auto max-w-5xl space-y-6 pb-12">
    <header className="rounded-[2rem] border border-[#c9a449]/50 bg-[#0a2547] p-8 text-white sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e3bd62]">Cripta · gestão</p>
      <h1 className="mt-4 font-serif text-4xl">Administração da Cripta</h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-200">Responsáveis, participação e guarda em um único lugar. Esta área registra metadados; não exibe cartas ou anexos.</p>
    </header>
    <nav aria-label="Etapas da sessão" className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-[#dbcda9] bg-white p-4"><strong>1 · Designar</strong><p className="mt-1 text-sm text-[#536074]">Venerável vigente, segundos responsáveis e substitutos.</p></div>
      <div className="rounded-xl border border-[#dbcda9] bg-white p-4"><strong>2 · Conferir e lacrar</strong><p className="mt-1 text-sm text-[#536074]">Fechar a escrita e registrar um recibo do inventário.</p></div>
      <div className="rounded-xl border border-[#dbcda9] bg-white p-4"><strong>3 · Deslacrar</strong><p className="mt-1 text-sm text-[#536074]">Na próxima sessão, confrontar código e inventário antes da abertura.</p></div>
    </nav>
    <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">Etapa 1 · deliberação em Loja</p>
      <h2 className="mt-2 font-serif text-2xl text-[#142a43]">Designar a guarda deste ciclo</h2>
      <p className="mt-2 text-sm leading-6 text-[#536074]">A função de primeiro responsável pertence ao Venerável Mestre da gestão vigente. Na próxima abertura, o sistema consultará novamente o cargo; se o ocupante mudou, o novo Venerável assume essa função. Registre em ata quem o acompanhará e quem poderá substituí-lo.</p>
      <div className="mt-4 rounded-xl border border-[#c9a449] bg-white p-4 text-sm"><strong>Venerável Mestre vigente:</strong> {currentMaster?.member.nomeCompleto ?? 'Não identificado na gestão vigente'}<p className="mt-1 text-[#536074]">Na designação anterior: {name(control?.masterAtDesignationId ?? control?.masterId)}</p></div>
      {!currentMaster && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">Cadastre o Venerável na gestão vigente e vincule sua conta antes de registrar esta designação.</p>}
      <form action={appointCustodians} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Segundo responsável pelo fechamento<select name="closingSecondId" required defaultValue={control?.closingSecondId ?? control?.secondId ?? ''} className={field}><option value="">Selecione</option>{eligible.filter((member) => member.id !== currentMaster?.member.id).map((member) => <option key={member.id} value={member.id}>{member.nomeCompleto}</option>)}</select></label>
        <label className="text-sm font-semibold">Segundo responsável pela próxima abertura<select name="openingSecondId" required defaultValue={control?.openingSecondId ?? control?.secondId ?? ''} className={field}><option value="">Selecione</option>{eligible.filter((member) => member.id !== currentMaster?.member.id).map((member) => <option key={member.id} value={member.id}>{member.nomeCompleto}</option>)}</select></label>
        <label className="text-sm font-semibold">Primeiro substituto <span className="font-normal">(opcional)</span><select name="alternate1Id" defaultValue={control?.alternateIds?.[0] ?? ''} className={field}><option value="">Nenhum</option>{eligible.filter((member) => member.id !== currentMaster?.member.id).map((member) => <option key={member.id} value={member.id}>{member.nomeCompleto}</option>)}</select></label>
        <label className="text-sm font-semibold">Segundo substituto <span className="font-normal">(opcional)</span><select name="alternate2Id" defaultValue={control?.alternateIds?.[1] ?? ''} className={field}><option value="">Nenhum</option>{eligible.filter((member) => member.id !== currentMaster?.member.id).map((member) => <option key={member.id} value={member.id}>{member.nomeCompleto}</option>)}</select></label>
        <label className="text-sm font-semibold sm:col-span-2">Ata ou referência da sessão<input name="minutes" required minLength={5} maxLength={160} defaultValue={control?.minutes ?? ''} placeholder="Ex.: Ata 123/2026" className={field} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Motivo da designação ou substituição<textarea name="reason" required minLength={8} maxLength={300} rows={2} placeholder="Ex.: Indicação para o próximo ciclo aprovada em sessão" className={field} /></label>
        <button disabled={!currentMaster} className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start">Registrar designação</button>
      </form>
      <details className="mt-4 text-sm text-[#725624]"><summary className="cursor-pointer font-semibold">? Como substituir alguém antes da próxima abertura?</summary><p className="mt-2">Delibere em sessão, atualize os nomes e informe a nova ata e o motivo. O registro anterior permanece no histórico. Se o Venerável mudar, atualize antes o cargo na gestão do Portal. A indicação não entrega chaves nem autoriza leitura das cartas.</p></details>
      {history.docs.length > 0 && <details className="mt-4 border-t pt-4 text-sm"><summary className="cursor-pointer font-semibold">Ver histórico de designações ({history.size})</summary><ol className="mt-3 space-y-2">{history.docs.map((doc) => <li key={doc.id}>{new Date(doc.data().at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · Ata {doc.data().minutes} · {doc.data().reason ?? 'Registro anterior'}</li>)}</ol></details>}
    </section>
    <OnlineOpeningControl initiallyOpen={onlineOpen} masterName={currentMaster?.member.nomeCompleto ?? ''}
      openingSecondId={control?.openingSecondId ?? ''} closingSecondId={control?.closingSecondId ?? ''}
      choices={[control?.openingSecondId, control?.closingSecondId, ...(control?.alternateIds ?? [])]
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
        .filter((id, index, all) => all.indexOf(id) === index)
        .map((id) => ({ id, name: name(id) }))} />
    <SealPanel initiallyOpen={onlineOpen} />
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <h2 className="font-serif text-2xl text-[#142a43]">Participação dos irmãos Ativos</h2>
      <p className="mt-2 text-sm text-[#536074]">{members.length} Ativos cadastrados · {eligible.length} com conta vinculada · {records.filter((record) => record.count > 0).length} com carta enviada · {records.filter((record) => record.hasDraft).length} com rascunho</p>
      {result.hasMore && <p className="mt-2 text-sm text-amber-800">A lista ultrapassa 100 irmãos; complete a paginação antes de usá-la como inventário oficial.</p>}
      <div className="mt-5 divide-y">{records.map(({ member, count, hasDraft }) => <div key={member.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span>{member.nomeCompleto}</span><strong>{count ? `${count} carta(s) enviada(s)` : hasDraft ? 'Em rascunho' : 'Ainda não iniciou'}</strong></div>)}</div>
      {members.length > eligible.length && <p className="mt-3 text-sm text-amber-800">Irmãos sem conta vinculada não podem enviar; regularize os acessos antes da abertura.</p>}
    </section>
    <UnitCheck />
  </div>;
}
