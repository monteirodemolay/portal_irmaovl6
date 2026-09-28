import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { OnlineOpeningControl } from '../online-opening-control';
import { SealPanel } from '../seal-panel';

export const metadata = { title: 'Reabertura | Cripta VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const [members, governance, open, master] = await Promise.all([
    createServerContainer().repositories.member.search({ tenantId, situacao: 'ativo' }, { limit: 100 }),
    getAdminFirestore().collection('criptaGovernanceV1').doc(tenantId).get(),
    isOnlineOpen(tenantId),
    currentCriptaMaster(tenantId),
  ]);
  const control = governance.data();
  const eligible = members.items.filter((member) => member.userId && member.id !== master?.member.id);
  return <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
    <Link href="/cripta-administracao" className="inline-block text-sm font-semibold text-[#123c69]">← Estado da Cripta</Link>
    <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">Cripta · fase 02</p>
      <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Reabertura da Cripta</h1>
      <p className="mt-4 max-w-2xl leading-7 text-slate-200">Na sessão, confira o recibo guardado, registre quem compareceu e libere a escrita quando a abertura for aprovada.</p>
    </header>
    <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
      <h2 className="font-serif text-2xl">1 · Data e Comissão</h2>
      <p className="mt-2 text-sm leading-6 text-[#5e584c]">A data é uma previsão. Se ela mudou, registre a ata e o motivo na tela de lacração antes da abertura. Os participantes efetivos são identificados no ato abaixo.</p>
      <p className="mt-3 text-sm font-semibold">Abertura prevista: {control?.nextOpeningDate ? new Date(`${control.nextOpeningDate}T12:00:00Z`).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'a definir'}</p>
      <Link href="/cripta-administracao/lacracao" className="mt-3 inline-block text-sm font-semibold text-[#123c69]">Atualizar Comissão e data →</Link>
    </section>
    <SealPanel initiallyOpen={open} />
    <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
      <h2 className="font-serif text-2xl">2 · Ler e verificar as unidades</h2>
      <p className="mt-2 text-sm leading-6 text-[#5e584c]">Leia cada pen drive na ferramenta offline e compare o arquivo com o manifesto. Se apenas uma cópia estiver íntegra, guarde-a e providencie outra antes de substituir a unidade perdida. O Portal ainda não recebe o resultado dessa conferência.</p>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold">? Um pen drive basta para abrir?</summary><p className="mt-2">No formato do pacote offline são necessárias duas partes da chave. Uma unidade íntegra pode ser combinada com o envelope guardado no cofre mediante o procedimento excepcional da Comissão.</p></details>
    </section>
    {!open ? <OnlineOpeningControl initiallyOpen={false} masterName={master?.member.nomeCompleto ?? ''}
      commissionMemberIds={control?.commissionMemberIds ?? []} nextOpeningDate={control?.nextOpeningDate ?? ''}
      choices={eligible.map((member) => ({ id: member.id, name: member.nomeCompleto }))} />
      : <p className="rounded-2xl border border-green-300 bg-green-50 p-6 font-semibold text-green-900">A escrita já está aberta. Os irmãos autorizados podem acessar suas cartas.</p>}
    <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6">
      <h2 className="font-serif text-2xl">3 · Acesso individual</h2>
      <p className="mt-2 text-sm leading-6 text-[#5e584c]">As cartas atualmente guardadas no Wix continuam vinculadas à conta de cada irmão. A distribuição do arquivo único dos pen drives para as contas depende da integração do novo ciclo e ainda não deve ser declarada concluída.</p>
    </section>
  </div>;
}
