import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { appointCustodians } from '../appoint-custodians';
import { OnlineOpeningControl } from '../online-opening-control';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { SealPanel } from '../seal-panel';
import { PhysicalUnitCheck } from '../physical-unit-check';
import { ExportPanel } from '../export-panel';
import Link from 'next/link';

export const metadata = { title: 'Lacração | Cripta VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();
  const [result, governance, onlineOpen, currentMaster, seal] = await Promise.all([
    container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    isOnlineOpen(tenantId),
    currentCriptaMaster(tenantId),
    db.collection('criptaSealsV1').doc(tenantId).get(),
  ]);
  const members = result.items;
  const eligible = members.filter((member) => !!member.userId);
  const records = await Promise.all(
    eligible.map(async (member) => {
      const [inventory, draft] = await Promise.all([
        db.collection('criptaOnlineCapsulesV1').where('uid', '==', member.userId!).get(),
        db
          .collection('criptaOnlineDraftsV1')
          .doc(tenantId)
          .collection('users')
          .doc(member.userId!)
          .get(),
      ]);
      return {
        member,
        hasDraft: draft.exists,
        count: inventory.docs.filter(
          (item) => item.data().tenantId === tenantId && item.data().status === 'ready',
        ).length,
      };
    }),
  );
  const control = governance.data();
  const name = (id: string | undefined) =>
    members.find((member) => member.id === id)?.nomeCompleto ?? 'Não indicado';
  const field = 'mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 text-[#142a43]';
  const history = await governance.ref.collection('events').orderBy('at', 'desc').limit(6).get();

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <Link
        href="/cripta-administracao"
        className="inline-block text-sm font-semibold text-[#123c69]"
      >
        ← Estado da Cripta
      </Link>
      <header className="rounded-[2rem] border border-[#c9a449]/50 bg-[#0a2547] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-[#e3bd62]">
          Cripta · gestão
        </p>
        <h1 className="mt-4 font-serif text-4xl">Recebimento e lacração</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-200">
          Nomeie a Comissão, abra o prazo de cartas e confira a participação. Ao encerrar, registre
          o fechamento e o recibo. O conteúdo das cartas não aparece nesta tela.
        </p>
      </header>
      <p className="text-sm text-[#8a9bb0]">
        Esta tela cobre as etapas 1, 3, 4, 5, 6 e 7 do ciclo anual. As etapas 2 (abrir o
        recebimento) e 8 (restaurar rascunhos) ficam na tela{' '}
        <Link href="/cripta-administracao/reabertura" className="font-semibold text-[#123c69]">
          Reabertura
        </Link>
        .
      </p>
      <nav
        aria-label="Etapas nesta tela, na ordem em que devem ser feitas"
        className="grid gap-3 sm:grid-cols-3"
      >
        <div className="rounded-xl border border-[#dbcda9] bg-white p-4">
          <strong>1 · Comissão</strong>
          <p className="mt-1 text-sm text-[#536074]">
            Antes de abrir: nomear os guardiões e prever a próxima data.
          </p>
        </div>
        <div className="rounded-xl border border-[#dbcda9] bg-white p-4">
          <strong>3 · Fechamento</strong>
          <p className="mt-1 text-sm text-[#536074]">
            Depois que os irmãos escreveram: fechar o recebimento.
          </p>
        </div>
        <div className="rounded-xl border border-[#dbcda9] bg-white p-4">
          <strong>4 · Lacração</strong>
          <p className="mt-1 text-sm text-[#536074]">Gerar o recibo do inventário para a ata.</p>
        </div>
        <div className="rounded-xl border border-[#dbcda9] bg-white p-4">
          <strong>5 · Exportação</strong>
          <p className="mt-1 text-sm text-[#536074]">
            Baixar o .lacre e copiar para as 3 unidades.
          </p>
        </div>
        <div className="rounded-xl border border-[#dbcda9] bg-white p-4">
          <strong>6 · Conferência</strong>
          <p className="mt-1 text-sm text-[#536074]">Ler duas unidades de volta e comparar.</p>
        </div>
        <div className="rounded-xl border border-[#dbcda9] bg-white p-4">
          <strong>7 · Limpeza</strong>
          <p className="mt-1 text-sm text-[#536074]">Só então apagar do Wix.</p>
        </div>
      </nav>
      <section className="rounded-2xl border border-[#dbcda9] bg-[#fbf8f1] p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
          Etapa 1 · deliberação em Loja
        </p>
        <h2 className="mt-2 font-serif text-2xl text-[#142a43]">Comissão de Guarda</h2>
        <p className="mt-2 text-sm leading-6 text-[#536074]">
          O Venerável Mestre da gestão vigente preside o fechamento. Indique de um a três irmãos
          Ativos para guardar a Cripta até a próxima abertura. A data é uma previsão: a Comissão
          pode remarcá-la em sessão, com ata e motivo. Os nomes de quem abrirá serão registrados
          somente quando a abertura acontecer.
        </p>
        <div className="mt-4 rounded-xl border border-[#c9a449] bg-white p-4 text-sm">
          <strong>Presidente no fechamento:</strong>{' '}
          {currentMaster?.member.nomeCompleto ?? 'Não identificado na gestão vigente'}
          {control &&
            Array.isArray(control.commissionMemberIds) &&
            control.commissionMemberIds.length > 0 && (
              <p className="mt-2 text-[#536074]">
                <strong>Comissão registrada:</strong>{' '}
                {control.commissionMemberIds.map((id: string) => name(id)).join(', ')} · abertura
                prevista:{' '}
                {control.nextOpeningDate
                  ? new Date(`${control.nextOpeningDate}T12:00:00Z`).toLocaleDateString('pt-BR', {
                      timeZone: 'UTC',
                    })
                  : 'a definir'}
              </p>
            )}
        </div>
        {!currentMaster && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            Cadastre o Venerável na gestão vigente e vincule sua conta antes de registrar esta
            designação.
          </p>
        )}
        <form action={appointCustodians} className="mt-5 grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((number) => (
            <label key={number} className="text-sm font-semibold">
              Integrante {number} {number > 1 && <span className="font-normal">(opcional)</span>}
              <select
                name={`guardian${number}Id`}
                required={number === 1}
                defaultValue={control?.commissionMemberIds?.[number - 1] ?? ''}
                className={field}
              >
                <option value="">{number === 1 ? 'Selecione' : 'Nenhum'}</option>
                {eligible
                  .filter((member) => member.id !== currentMaster?.member.id)
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.nomeCompleto}
                    </option>
                  ))}
              </select>
            </label>
          ))}
          <label className="text-sm font-semibold">
            Próxima abertura prevista
            <input
              type="date"
              name="nextOpeningDate"
              required
              defaultValue={control?.nextOpeningDate ?? ''}
              className={field}
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Ata ou referência da sessão
            <input
              name="minutes"
              required
              minLength={5}
              maxLength={160}
              defaultValue={control?.minutes ?? ''}
              placeholder="Ex.: Ata 123/2026"
              className={field}
            />
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Deliberação ou motivo da mudança
            <textarea
              name="reason"
              required
              minLength={8}
              maxLength={300}
              rows={2}
              placeholder="Ex.: Comissão aprovada em sessão; ou remarcação por impossibilidade"
              className={field}
            />
          </label>
          <button
            disabled={!currentMaster}
            className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
          >
            {control?.commissionMemberIds?.length
              ? 'Atualizar Comissão ou data'
              : 'Nomear Comissão de Guarda'}
          </button>
        </form>
        <details className="mt-4 text-sm text-[#725624]">
          <summary className="cursor-pointer font-semibold">
            ? E se houver atraso, morte ou afastamento?
          </summary>
          <p className="mt-2">
            Em sessão, escolha outra data ou substitua um integrante, informe a nova ata e o motivo.
            O histórico preserva a indicação anterior. Se mudar o Venerável, atualize o cargo na
            gestão do Portal; o novo titular presidirá o ato seguinte.
          </p>
        </details>
        {history.docs.length > 0 && (
          <details className="mt-4 border-t pt-4 text-sm">
            <summary className="cursor-pointer font-semibold">
              Ver histórico da Comissão ({history.size})
            </summary>
            <ol className="mt-3 space-y-2">
              {history.docs.map((doc) => (
                <li key={doc.id}>
                  {new Date(doc.data().at).toLocaleString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                  })}{' '}
                  · Ata {doc.data().minutes} · {doc.data().reason ?? 'Registro anterior'}
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>
      {onlineOpen && (
        <OnlineOpeningControl
          step="3"
          initiallyOpen={onlineOpen}
          masterName={currentMaster?.member.nomeCompleto ?? ''}
          commissionMemberIds={control?.commissionMemberIds ?? []}
          nextOpeningDate={control?.nextOpeningDate ?? ''}
          choices={eligible
            .filter((member) => member.id !== currentMaster?.member.id)
            .map((member) => ({ id: member.id, name: member.nomeCompleto }))}
        />
      )}
      <SealPanel initiallyOpen={onlineOpen} step="4 · lacração" />
      {seal.data()?.status === 'sealed' && (
        <ExportPanel
          receiptCode={seal.data()!.code as string}
          totalLetters={seal.data()!.letters as number}
          inventoryDigest={seal.data()!.inventoryDigest as string}
          physicalCheckOk={seal.data()!.physicalCheck?.receiptDigest === seal.data()!.receiptDigest}
          cleanupComplete={
            seal.data()!.cleanup?.receiptCode === seal.data()!.code &&
            seal.data()!.cleanup?.complete === true
          }
        />
      )}
      {seal.data()?.status === 'sealed' && (
        <PhysicalUnitCheck
          receiptCode={seal.data()!.code as string}
          totalLetters={seal.data()!.letters as number}
          inventoryDigest={seal.data()!.inventoryDigest as string}
          recorded={
            seal.data()!.physicalCheck?.receiptDigest === seal.data()!.receiptDigest
              ? seal.data()!.physicalCheck
              : null
          }
        />
      )}
      <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
        <h2 className="font-serif text-2xl text-[#142a43]">Participação dos irmãos Ativos</h2>
        <p className="mt-2 text-sm text-[#536074]">
          {members.length} Ativos cadastrados · {eligible.length} com conta vinculada ·{' '}
          {records.filter((record) => record.count > 0).length} com carta enviada ·{' '}
          {records.filter((record) => record.hasDraft).length} com rascunho
        </p>
        {result.hasMore && (
          <p className="mt-2 text-sm text-amber-800">
            A lista ultrapassa 100 irmãos; complete a paginação antes de usá-la como inventário
            oficial.
          </p>
        )}
        <div className="mt-5 divide-y">
          {records.map(({ member, count, hasDraft }) => (
            <div key={member.id} className="flex items-center justify-between gap-4 py-3 text-sm">
              <span>{member.nomeCompleto}</span>
              <strong>
                {count
                  ? `${count} carta(s) enviada(s)`
                  : hasDraft
                    ? 'Em rascunho'
                    : 'Ainda não iniciou'}
              </strong>
            </div>
          ))}
        </div>
        {members.length > eligible.length && (
          <p className="mt-3 text-sm text-amber-800">
            Irmãos sem conta vinculada não podem enviar; regularize os acessos antes da abertura.
          </p>
        )}
      </section>
    </div>
  );
}
