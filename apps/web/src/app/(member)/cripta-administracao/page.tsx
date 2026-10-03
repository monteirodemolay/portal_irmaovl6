import Link from 'next/link';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import { currentWizardStatus } from '@/modules/cripta/lib/wizard-status';
import { ceremonyStates } from '@/modules/cripta/lib/cycle-wizard';
import { letterRecordsCollection } from '@/modules/cripta/lib/letter-record';
import { CeremonyCard } from './ceremony-card';
import { CycleWizardView } from './cycle-wizard-view';
import { GuardianSharesPanel } from './guardian-shares-panel';
import { InaugurationPanel } from './inauguration-panel';
import { ComissaoForm } from './comissao-form';
import { OnlineOpeningControl } from './online-opening-control';
import { SealPanel } from './seal-panel';
import { ExportPanel } from './export-panel';
import { PhysicalUnitCheck } from './physical-unit-check';
import { CleanupPanel } from './cleanup-panel';
import { RestorePanel } from './restore-panel';
import { ResetPanel } from './reset-panel';

export const maxDuration = 300;

export const metadata = {
  title: 'Cripta do Irmão · Administração | Portal VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();

  const [membersResult, governance, open, master, seal, inauguration, wizard, retainedLetterCount] =
    await Promise.all([
      container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
      db.collection('criptaGovernanceV1').doc(tenantId).get(),
      isOnlineOpen(tenantId),
      currentCriptaMaster(tenantId),
      db.collection('criptaSealsV1').doc(tenantId).get(),
      readCriptaPublicKey(tenantId),
      currentWizardStatus(tenantId),
      countRetainedLetterRecords(tenantId),
    ]);

  const members = membersResult.items;
  const control = governance.data();
  const sealData = seal.data();
  const eligible = members.filter((member) => member.userId && member.id !== master?.member.id);

  const name = (id: string | undefined) =>
    members.find((member) => member.id === id)?.nomeCompleto ?? 'Não indicado';
  const choices = eligible.map((member) => ({ id: member.id, name: member.nomeCompleto }));

  // A Comissão marca "nextOpeningDate" com antecedência (ComissaoForm); como não há cron neste
  // ambiente, a abertura em si continua sendo um clique manual — isto só decide se o aviso "hoje
  // é o dia marcado" aparece nas fases de abertura, calculado no fuso do Rio/São Paulo para não
  // depender do relógio do navegador de quem está logado.
  const todayBR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );
  const openingDue = !!control?.nextOpeningDate && todayBR >= control.nextOpeningDate;
  const states = ceremonyStates(wizard.phase);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">
          Cripta · administração
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">A Cripta, passo a passo</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Quatro cerimônias: <strong>Inauguração</strong> (ato único), <strong>Abertura</strong>,{' '}
          <strong>Fechamento</strong> e <strong>Reabertura</strong> — esta tela sempre mostra só a
          etapa de agora, sem ir e voltar entre telas.
        </p>
        <Link
          href="/cripta-projetor"
          className="mt-4 inline-block rounded-xl border border-[#e3bd62]/60 px-4 py-2 text-sm font-semibold text-[#e3bd62] hover:bg-[#e3bd62]/10"
        >
          Abrir o Projetor para a sessão →
        </Link>
      </header>

      <CycleWizardView result={wizard} />
      <GuardianSharesPanel />

      {wizard.phase !== 'inauguracao' && wizard.phase !== 'comissao' && (
        <>
          <ComissaoSummary control={control} name={name} />
          <ComissaoForm
            eligible={eligible.map((member) => ({
              id: member.id,
              nomeCompleto: member.nomeCompleto,
            }))}
            masterName={master?.member.nomeCompleto ?? ''}
            masterMissing={!master}
            control={control}
            prominent={false}
          />
        </>
      )}

      <CeremonyCard
        id="inauguracao"
        title="Inauguração"
        badge="Ato único"
        state={states.inauguracao}
      >
        {!master && (
          <p className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
            Cadastre o Venerável Mestre na gestão vigente e vincule sua conta antes de abrir esta
            sessão.
          </p>
        )}
        <p className="text-sm leading-6 text-[#536074]">
          Ato único, em sessão fechada: nomeia os Guardiões da Cripta e gera a chave que vai
          proteger todas as cartas, sem que ninguém — nem a própria Loja — precise guardar uma senha
          por Irmão.
        </p>
        <InaugurationPanel
          eligible={members
            .filter((member) => member.userId)
            .map((member) => ({ id: member.id, name: member.nomeCompleto }))}
          existing={inauguration}
          masterName={master?.member.nomeCompleto ?? ''}
        />
      </CeremonyCard>

      <CeremonyCard id="abertura" title="Abertura" state={states.abertura}>
        {wizard.phase === 'comissao' && (
          <ComissaoForm
            eligible={eligible.map((member) => ({
              id: member.id,
              nomeCompleto: member.nomeCompleto,
            }))}
            masterName={master?.member.nomeCompleto ?? ''}
            masterMissing={!master}
            control={control}
            prominent
          />
        )}
        {wizard.phase === 'abrir' && (
          <OnlineOpeningControl
            step="2"
            initiallyOpen={false}
            due={openingDue}
            masterName={master?.member.nomeCompleto ?? ''}
            commissionMemberIds={control?.commissionMemberIds ?? []}
            nextOpeningDate={control?.nextOpeningDate ?? ''}
            choices={choices}
          />
        )}
        {wizard.phase === 'aberto' && (
          <AbertoPhase
            tenantId={tenantId}
            members={members}
            eligible={eligible}
            choices={choices}
            control={control}
            master={master}
            open={open}
          />
        )}
      </CeremonyCard>

      <CeremonyCard id="fechamento" title="Fechamento" state={states.fechamento}>
        {wizard.phase === 'lacrar' && (
          <SealPanel initiallyOpen={false} step="4 · lacração" showAdvanceAfterSeal />
        )}
        {wizard.phase === 'exportar' && sealData?.status === 'sealed' && (
          <>
            <ExportPanel
              receiptCode={sealData.code as string}
              totalLetters={sealData.letters as number}
              inventoryDigest={sealData.inventoryDigest as string}
            />
            <PhysicalUnitCheck
              receiptCode={sealData.code as string}
              totalLetters={sealData.letters as number}
              inventoryDigest={sealData.inventoryDigest as string}
              recorded={
                sealData.physicalCheck?.receiptDigest === sealData.receiptDigest
                  ? sealData.physicalCheck
                  : null
              }
            />
            <CleanupPanel
              physicalCheckOk={sealData.physicalCheck?.receiptDigest === sealData.receiptDigest}
              cleanupComplete={
                sealData.cleanup?.receiptCode === sealData.code &&
                sealData.cleanup?.complete === true
              }
            />
          </>
        )}
      </CeremonyCard>

      <CeremonyCard id="reabertura" title="Reabertura" state={states.reabertura}>
        {wizard.phase === 'restaurar' && sealData?.status === 'sealed' && (
          <RestorePanel
            receiptCode={sealData.code as string}
            recorded={
              sealData.restoration?.receiptCode === sealData.code ? sealData.restoration : null
            }
            retainedLetterCount={retainedLetterCount}
          />
        )}
        {wizard.phase === 'reabrir' && (
          <OnlineOpeningControl
            step="2"
            initiallyOpen={false}
            due={openingDue}
            masterName={master?.member.nomeCompleto ?? ''}
            commissionMemberIds={control?.commissionMemberIds ?? []}
            nextOpeningDate={control?.nextOpeningDate ?? ''}
            choices={choices}
          />
        )}
      </CeremonyCard>

      <hr className="border-[#d8c8a4]" />

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
          Processo excepcional · fora do ciclo anual
        </p>
        <Link
          href="/cripta-administracao/abertura-individual"
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
          limpeza de cada ano é a etapa 7, vista acima durante a Exportação.
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

async function AbertoPhase({
  tenantId,
  members,
  eligible,
  choices,
  control,
  master,
  open,
}: {
  tenantId: string;
  members: Array<{ id: string; userId?: string | null; nomeCompleto: string }>;
  eligible: Array<{ id: string; userId?: string | null; nomeCompleto: string }>;
  choices: Array<{ id: string; name: string }>;
  control: FirebaseFirestore.DocumentData | undefined;
  master: Awaited<ReturnType<typeof currentCriptaMaster>>;
  open: boolean;
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
    <>
      <section className="rounded-2xl border border-[#dbcda9] bg-white p-6">
        <h2 className="font-serif text-2xl text-[#142a43]">Participação dos irmãos Ativos</h2>
        <p className="mt-2 text-sm text-[#536074]">
          {members.length} Ativos cadastrados · {eligible.length} com conta vinculada ·{' '}
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
      <OnlineOpeningControl
        step="3"
        initiallyOpen={open}
        masterName={master?.member.nomeCompleto ?? ''}
        commissionMemberIds={control?.commissionMemberIds ?? []}
        nextOpeningDate={control?.nextOpeningDate ?? ''}
        choices={choices}
      />
    </>
  );
}

/** Só a contagem, nunca quais cartas — o operador precisa saber que o pacote de entrega da
 * reabertura tem retenções a respeitar, sem ver de quem. */
async function countRetainedLetterRecords(tenantId: string): Promise<number> {
  const snapshot = await letterRecordsCollection(tenantId).where('status', '==', 'retida').get();
  return snapshot.size;
}
