import Link from 'next/link';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { currentWizardStatus } from '@/modules/cripta/lib/wizard-status';
import { letterRecordsCollection } from '@/modules/cripta/lib/letter-record';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import { CycleWizardView } from './cycle-wizard-view';
import { CeremonyHistory } from './ceremony-history';
import { GuardianSharesPanel } from './guardian-shares-panel';
import { RenewalPanel } from './renewal-panel';
import { CleanupPanel } from './cleanup-panel';
import { RestorePanel } from './restore-panel';
import { ResetPanel } from './reset-panel';

export const maxDuration = 300;

export const metadata = {
  title: 'Cripta do Irmão · Administração | Portal VL6',
  robots: { index: false, follow: false },
};

/** Só visualização do que já foi feito + administração geral (contas, manutenção) — os
 * formulários de ação de cada cerimônia (sortear, gerar chave, nomear Comissão, abrir/fechar
 * recebimento, lacrar, exportar, conferir) ficaram no Projetor: a mesma tela projetada durante a
 * sessão, operada ali mesmo. Ver docs/architecture/cripta-reabertura-ficha-e-cerimonia.md. */
export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();

  const [membersResult, governance, master, seal, wizard, retainedLetterCount, inauguration] =
    await Promise.all([
      container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
      db.collection('criptaGovernanceV1').doc(tenantId).get(),
      currentCriptaMaster(tenantId),
      db.collection('criptaSealsV1').doc(tenantId).get(),
      currentWizardStatus(tenantId),
      countRetainedLetterRecords(tenantId),
      readCriptaPublicKey(tenantId),
    ]);

  const members = membersResult.items;
  const control = governance.data();
  const sealData = seal.data();
  const eligible = members.filter((member) => member.userId && member.id !== master?.member.id);

  const name = (id: string | undefined) =>
    members.find((member) => member.id === id)?.nomeCompleto ?? 'Não indicado';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">
          Cripta · administração
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Administração da Cripta</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Esta tela é só para acompanhar o que já foi feito e para a administração geral — guarda de
          partes, manutenção e a Renovação de Guardiões. As cerimônias em si (Inauguração, Abertura,
          Fechamento, Reabertura) são operadas no Projetor, a tela projetada durante a sessão.
        </p>
        <Link
          href="/admin/cripta/projetor"
          className="mt-4 inline-block rounded-xl border border-[#e3bd62]/60 px-4 py-2 text-sm font-semibold text-[#e3bd62] hover:bg-[#e3bd62]/10"
        >
          Abrir o Projetor para operar a cerimônia →
        </Link>
      </header>

      <CycleWizardView result={wizard} />
      {inauguration && (
        <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm leading-6 text-green-950">
          <strong>Inauguração concluída</strong> em{' '}
          {new Date(inauguration.inauguratedAt).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          })}{' '}
          · {inauguration.totalGuardians} Guardiões, limiar {inauguration.threshold}.
        </div>
      )}
      <CeremonyHistory wizard={wizard} />
      <ComissaoSummary control={control} name={name} />
      {wizard.phase === 'aberto' && (
        <WritingProgress tenantId={tenantId} eligible={eligible} membersTotal={members.length} />
      )}

      <GuardianSharesPanel />

      {wizard.phase === 'exportar' && sealData?.status === 'sealed' && (
        <CleanupPanel
          physicalCheckOk={sealData.physicalCheck?.receiptDigest === sealData.receiptDigest}
          cleanupComplete={
            sealData.cleanup?.receiptCode === sealData.code && sealData.cleanup?.complete === true
          }
        />
      )}
      {wizard.phase === 'restaurar' && sealData?.status === 'sealed' && (
        <RestorePanel
          receiptCode={sealData.code as string}
          recorded={
            sealData.restoration?.receiptCode === sealData.code ? sealData.restoration : null
          }
          retainedLetterCount={retainedLetterCount}
        />
      )}

      {wizard.phase !== 'aberto' && (
        <RenewalPanel
          eligible={eligible.map((member) => ({ id: member.id, name: member.nomeCompleto }))}
        />
      )}

      <hr className="border-[#d8c8a4]" />

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
          Processo excepcional · fora do ciclo anual
        </p>
        <Link
          href="/admin/cripta/abertura-individual"
          className="mt-2 block rounded-2xl border border-[#d8c8a4] bg-white p-6 shadow-sm transition hover:border-[#8a6a1f] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a1f]"
        >
          <strong className="font-serif text-2xl">Abertura individual</strong>
          <span className="mt-3 block text-sm leading-6 text-[#5e584c]">
            Só por falecimento ou desligamento de um irmão — não depende da janela anual estar
            aberta ou fechada.
          </span>
          <span className="mt-4 block font-semibold text-[#123c69]">Abrir tela →</span>
        </Link>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-red-800">
          Ferramenta de ensaio · apaga dados de verdade
        </p>
        <p className="mt-1 text-sm text-[#5e584c]">
          Use só para repetir um percurso de teste do zero. Não é parte do ciclo anual normal — a
          limpeza de cada ano é a etapa 7, operada no Projetor durante a Exportação, e concluída
          aqui.
        </p>
        <div className="mt-3">
          <ResetPanel />
        </div>
      </section>
    </div>
  );
}

function ComissaoSummary({
  control,
  name,
}: {
  control: FirebaseFirestore.DocumentData | undefined;
  name: (id: string | undefined) => string;
}) {
  if (!control?.commissionMemberIds?.length) return null;
  return (
    <div className="rounded-xl border border-[#c9a449] bg-white p-4 text-sm">
      <strong>Comissão registrada:</strong>{' '}
      {(control.commissionMemberIds as string[]).map((id) => name(id)).join(', ')}
      {control.nextOpeningDate && (
        <>
          {' '}
          · abertura prevista:{' '}
          {new Date(`${control.nextOpeningDate}T12:00:00Z`).toLocaleDateString('pt-BR', {
            timeZone: 'UTC',
          })}
        </>
      )}
    </div>
  );
}

/** Só a contagem de participação — a ação de fechar a escrita ficou no Projetor. */
async function WritingProgress({
  tenantId,
  eligible,
  membersTotal,
}: {
  tenantId: string;
  eligible: Array<{ id: string; userId?: string | null; nomeCompleto: string }>;
  membersTotal: number;
}) {
  const db = getAdminFirestore();
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
        hasDraft: draft.exists && draft.data()?.status !== 'deleted',
        count: inventory.docs.filter(
          (item) => item.data().tenantId === tenantId && item.data().status === 'ready',
        ).length,
      };
    }),
  );
  return (
    <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
      <h2 className="font-serif text-2xl text-[#142a43]">Participação dos irmãos Ativos</h2>
      <p className="mt-2 text-sm text-[#536074]">
        {membersTotal} Ativos cadastrados · {eligible.length} com conta vinculada ·{' '}
        {records.filter((record) => record.count > 0).length} com carta enviada ·{' '}
        {records.filter((record) => record.hasDraft).length} com rascunho
      </p>
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
    </section>
  );
}

/** Só a contagem, nunca quais cartas — o operador precisa saber que o pacote de entrega da
 * reabertura tem retenções a respeitar, sem ver de quem. */
async function countRetainedLetterRecords(tenantId: string): Promise<number> {
  const snapshot = await letterRecordsCollection(tenantId).where('status', '==', 'retida').get();
  return snapshot.size;
}
