import Link from 'next/link';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import {
  currentGuardianShares,
  validShareCount,
  guardianAlertLevel,
} from '@/modules/cripta/lib/guardian-shares';
import { currentWizardStatus } from '@/modules/cripta/lib/wizard-status';
import { ceremonyStates } from '@/modules/cripta/lib/cycle-wizard';
import { CeremonyCard } from '../cripta-administracao/ceremony-card';
import { CycleWizardView } from '../cripta-administracao/cycle-wizard-view';
import { InaugurationPanel } from '../cripta-administracao/inauguration-panel';
import { ComissaoForm } from '../cripta-administracao/comissao-form';
import { OnlineOpeningControl } from '../cripta-administracao/online-opening-control';
import { SealPanel } from '../cripta-administracao/seal-panel';
import { ExportPanel } from '../cripta-administracao/export-panel';
import { PhysicalUnitCheck } from '../cripta-administracao/physical-unit-check';

export const maxDuration = 300;

export const metadata = {
  title: 'Cripta do Irmão · Projetor | Portal VL6',
  robots: { index: false, follow: false },
};

/** A tela projetada DURANTE a cerimônia — e agora também onde ela é operada: quem conduz a
 * sessão clica aqui mesmo, na mesma tela que a Loja está vendo, em vez de alternar com uma
 * segunda tela de administração. "O que eu preencher, aparece lá" deixa de precisar de
 * sincronização: é a mesma tela. Gated como a Administração — presença, sorteio e atas são dados
 * operacionais da cerimônia, não conteúdo de carta, mas ainda assim não são para qualquer tela.
 * Ver docs/architecture/cripta-reabertura-ficha-e-cerimonia.md. */
export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  const tenantId = session.authContext.tenantId;
  const container = createServerContainer();
  const db = getAdminFirestore();

  const [membersResult, governance, open, master, seal, inauguration, wizard] = await Promise.all([
    container.repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    isOnlineOpen(tenantId),
    currentCriptaMaster(tenantId),
    db.collection('criptaSealsV1').doc(tenantId).get(),
    readCriptaPublicKey(tenantId),
    currentWizardStatus(tenantId),
  ]);

  const members = membersResult.items;
  const control = governance.data();
  const sealData = seal.data();
  const eligible = members.filter((member) => member.userId && member.id !== master?.member.id);
  const choices = eligible.map((member) => ({ id: member.id, name: member.nomeCompleto }));
  const states = ceremonyStates(wizard.phase);

  const todayBR = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(
    new Date(),
  );
  const openingDue = !!control?.nextOpeningDate && todayBR >= control.nextOpeningDate;

  const alert = inauguration
    ? guardianAlertLevel(
        validShareCount(currentGuardianShares(inauguration)),
        inauguration.totalGuardians,
        inauguration.threshold,
      )
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">
          Loja Maçônica Verdadeira Luz nº 06 · Cripta do Irmão
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Projetor da Cripta</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Quatro cerimônias: <strong>Inauguração</strong> (ato único), <strong>Abertura</strong>,{' '}
          <strong>Fechamento</strong> e <strong>Reabertura</strong> — esta tela mostra e opera só a
          etapa de agora.
        </p>
        {alert && alert !== 'ok' && (
          <p
            className={`mt-4 inline-block rounded-full border px-4 py-2 text-sm font-semibold ${
              alert === 'critico'
                ? 'border-red-400 bg-red-950/60 text-red-100'
                : alert === 'urgente'
                  ? 'border-orange-400 bg-orange-950/60 text-orange-100'
                  : 'border-amber-400 bg-amber-950/60 text-amber-100'
            }`}
          >
            {alert === 'critico' ? 'Crítico' : alert === 'urgente' ? 'Urgente' : 'Atenção'} · partes
            dos Guardiões — ver detalhes na Administração
          </p>
        )}
        <Link
          href="/cripta-administracao"
          className="mt-4 block text-sm font-semibold text-[#e3bd62] hover:underline"
        >
          ← Ver histórico e administração geral
        </Link>
      </header>

      <CycleWizardView result={wizard} />

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
          <>
            <p className="rounded-xl border border-[#dbcda9] bg-white p-4 text-sm text-[#536074]">
              Recebimento aberto — o acompanhamento de quem já escreveu fica na Administração.
              Quando chegar a hora, feche a escrita aqui.
            </p>
            <OnlineOpeningControl
              step="3"
              initiallyOpen={open}
              masterName={master?.member.nomeCompleto ?? ''}
              commissionMemberIds={control?.commissionMemberIds ?? []}
              nextOpeningDate={control?.nextOpeningDate ?? ''}
              choices={choices}
            />
          </>
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
            <p className="rounded-xl border border-[#dbcda9] bg-white p-4 text-sm text-[#536074]">
              Depois da conferência física, a Limpeza do Wix é concluída na Administração.
            </p>
          </>
        )}
      </CeremonyCard>

      <CeremonyCard id="reabertura" title="Reabertura" state={states.reabertura}>
        {wizard.phase === 'restaurar' && (
          <p className="rounded-xl border border-[#dbcda9] bg-white p-4 text-sm text-[#536074]">
            A restauração dos rascunhos para esta rodada é feita na Administração.
          </p>
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
    </div>
  );
}
