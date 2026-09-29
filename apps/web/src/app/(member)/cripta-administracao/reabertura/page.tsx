import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { OnlineOpeningControl } from '../online-opening-control';
import { SealPanel } from '../seal-panel';
import { RestorePanel } from '../restore-panel';

export const metadata = {
  title: 'Reabertura | Cripta VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const [members, governance, open, master, seal] = await Promise.all([
    createServerContainer().repositories.member.search(
      { tenantId, situacao: 'ativo' },
      { limit: 100 },
    ),
    getAdminFirestore().collection('criptaGovernanceV1').doc(tenantId).get(),
    isOnlineOpen(tenantId),
    currentCriptaMaster(tenantId),
    getAdminFirestore().collection('criptaSealsV1').doc(tenantId).get(),
  ]);
  const control = governance.data();
  const record = seal.data();
  const cleanupComplete =
    record?.status === 'sealed' &&
    record.cleanup?.receiptCode === record.code &&
    record.cleanup?.complete === true;
  const restoration =
    record?.restoration?.receiptCode === record?.code ? record?.restoration : null;
  const eligible = members.items.filter(
    (member) => member.userId && member.id !== master?.member.id,
  );
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <Link
        href="/cripta-administracao"
        className="inline-block text-sm font-semibold text-[#123c69]"
      >
        ← Estado da Cripta
      </Link>
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">
          Cripta · continuação do ciclo (etapas 6, 8 e 2)
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Reabertura da Cripta</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Use esta tela depois de lacrar, exportar e limpar o Wix na tela de Lacração. A ordem aqui
          é: confirme a conferência das unidades, restaure os rascunhos e só então reabra a escrita.
        </p>
      </header>
      <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
        <h2 className="font-serif text-2xl">Antes de continuar: data e Comissão</h2>
        <p className="mt-2 text-sm leading-6 text-[#5e584c]">
          A data é uma previsão. Se ela mudou, registre a ata e o motivo na tela de lacração antes
          da abertura. Os participantes efetivos são identificados no ato abaixo.
        </p>
        <p className="mt-3 text-sm font-semibold">
          Abertura prevista:{' '}
          {control?.nextOpeningDate
            ? new Date(`${control.nextOpeningDate}T12:00:00Z`).toLocaleDateString('pt-BR', {
                timeZone: 'UTC',
              })
            : 'a definir'}
        </p>
        <Link
          href="/cripta-administracao/lacracao"
          className="mt-3 inline-block text-sm font-semibold text-[#123c69]"
        >
          Atualizar Comissão e data →
        </Link>
      </section>
      <SealPanel initiallyOpen={open} />
      <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
        <h2 className="font-serif text-2xl">6 · Confirme a conferência das unidades</h2>
        <p className="mt-2 text-sm leading-6 text-[#5e584c]">
          Antes de restaurar, leia pelo menos duas das três unidades na tela de Lacração (“Ler as
          cópias gravadas”) e confira se batem com o manifesto e o recibo. Só prossiga para a etapa
          8, abaixo, depois disso.
        </p>
        <Link
          href="/cripta-administracao/lacracao"
          className="mt-3 inline-block text-sm font-semibold text-[#123c69]"
        >
          Conferir as unidades →
        </Link>
      </section>
      {record?.status === 'sealed' &&
        (cleanupComplete ? (
          <RestorePanel receiptCode={record.code as string} recorded={restoration ?? null} />
        ) : (
          <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
            <h2 className="font-serif text-2xl">8 · Restaurar rascunhos</h2>
            <p className="mt-2 text-sm leading-6 text-[#5e584c]">
              Fica disponível depois que a limpeza do Wix deste lacre (etapa 7) for confirmada na
              tela de Lacração.
            </p>
          </section>
        ))}
      {!open ? (
        <OnlineOpeningControl
          step="2"
          initiallyOpen={false}
          masterName={master?.member.nomeCompleto ?? ''}
          commissionMemberIds={control?.commissionMemberIds ?? []}
          nextOpeningDate={control?.nextOpeningDate ?? ''}
          choices={eligible.map((member) => ({ id: member.id, name: member.nomeCompleto }))}
        />
      ) : (
        <p className="rounded-2xl border border-green-300 bg-green-50 p-6 font-semibold text-green-900">
          A escrita já está aberta. Os irmãos autorizados podem acessar suas cartas.
        </p>
      )}
    </div>
  );
}
