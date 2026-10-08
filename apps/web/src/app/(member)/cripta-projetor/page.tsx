import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { currentWizardStatus } from '@/modules/cripta/lib/wizard-status';
import { ceremonyForPhase } from '@/modules/cripta/lib/cycle-wizard';
import { letterRecordsCollection } from '@/modules/cripta/lib/letter-record';
import { InaugurationStage } from './inauguration-stage';
import { AberturaStage } from './abertura-stage';
import { FechamentoStage } from './fechamento-stage';
import { ReaberturaStage } from './reabertura-stage';

export const maxDuration = 300;

export const metadata = {
  title: 'Cripta do Irmão · Projetor | Portal VL6',
  robots: { index: false, follow: false },
};

/** A tela projetada DURANTE a cerimônia, do início ao fim — e também onde ela é operada: quem
 * conduz a sessão clica aqui mesmo, na mesma tela que a Loja está vendo. Mostra só a cerimônia
 * em curso, em apresentação de tela cheia, placa por placa — nunca histórico, manutenção ou
 * administração geral: isso é só na Administração (ver cripta-administracao/page.tsx). Gated
 * como a Administração — presença, sorteio e atas são dados operacionais da cerimônia, não
 * conteúdo de carta, mas ainda assim não são para qualquer tela.
 * Ver docs/architecture/cripta-reabertura-ficha-e-cerimonia.md. */
export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();

  const [membersResult, governance, master, seal, wizard] = await Promise.all([
    container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    currentCriptaMaster(tenantId),
    db.collection('criptaSealsV1').doc(tenantId).get(),
    currentWizardStatus(tenantId),
  ]);

  const members = membersResult.items;
  const control = governance.data();
  const sealData = seal.data();
  const masterName = master?.member.nomeCompleto ?? '';
  const eligible = members.filter((member) => member.userId && member.id !== master?.member.id);
  const choices = eligible.map((member) => ({ id: member.id, name: member.nomeCompleto }));

  const todayBR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );
  const openingDue = !!control?.nextOpeningDate && todayBR >= control.nextOpeningDate;

  const ceremony = ceremonyForPhase(wizard.phase);

  if (ceremony === 'inauguracao') {
    return (
      <InaugurationStage
        eligible={members
          .filter((member) => member.userId && member.id !== master?.member.id)
          .map((member) => ({ id: member.id, name: member.nomeCompleto }))}
        masterName={masterName}
      />
    );
  }

  if (ceremony === 'abertura') {
    const { wrote, total } = await countWritingParticipation(tenantId, eligible);
    return (
      <AberturaStage
        phase={wizard.phase as 'comissao' | 'abrir' | 'aberto'}
        masterName={masterName}
        masterMissing={!master}
        eligible={eligible.map((member) => ({ id: member.id, nomeCompleto: member.nomeCompleto }))}
        control={control}
        choices={choices}
        openingDue={openingDue}
        wrote={wrote}
        total={total}
      />
    );
  }

  if (ceremony === 'fechamento') {
    return (
      <FechamentoStage
        wizardSteps={wizard.steps}
        sealData={
          sealData
            ? {
                code: sealData.code as string,
                letters: sealData.letters as number,
                inventoryDigest: sealData.inventoryDigest as string,
                receiptDigest: sealData.receiptDigest as string | undefined,
                physicalCheck: sealData.physicalCheck ?? null,
              }
            : null
        }
      />
    );
  }

  const retainedLetterCount = await countRetainedLetterRecords(tenantId);
  return (
    <ReaberturaStage
      phase={wizard.phase as 'restaurar' | 'reabrir'}
      masterName={masterName}
      control={control}
      choices={choices}
      openingDue={openingDue}
      retainedLetterCount={retainedLetterCount}
      receiptCode={sealData?.code as string | undefined}
      restoration={
        sealData?.restoration?.receiptCode === sealData?.code ? sealData?.restoration : null
      }
    />
  );
}

/** Só a contagem — nunca quais Irmãos, nem o conteúdo. Mesma fonte que a Administração usa para
 * o acompanhamento detalhado; aqui vira só dois números para a placa de status. */
async function countWritingParticipation(
  tenantId: string,
  eligible: Array<{ id: string; userId?: string | null }>,
): Promise<{ wrote: number; total: number }> {
  const db = getAdminFirestore();
  const counts = await Promise.all(
    eligible.map(async (member) => {
      if (!member.userId) return false;
      const inventory = await db
        .collection('criptaOnlineCapsulesV1')
        .where('uid', '==', member.userId)
        .get();
      return inventory.docs.some(
        (item) => item.data().tenantId === tenantId && item.data().status === 'ready',
      );
    }),
  );
  return { wrote: counts.filter(Boolean).length, total: eligible.length };
}

/** Só a contagem, nunca quais cartas — o mesmo princípio usado na Administração. */
async function countRetainedLetterRecords(tenantId: string): Promise<number> {
  const snapshot = await letterRecordsCollection(tenantId).where('status', '==', 'retida').get();
  return snapshot.size;
}
