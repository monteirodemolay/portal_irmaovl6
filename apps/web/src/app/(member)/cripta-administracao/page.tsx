import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';

export const metadata = {
  title: 'Estado da Cripta | Portal VL6',
  robots: { index: false, follow: false },
};

const stages = [
  {
    href: '/cripta-administracao/inauguracao',
    title: '00 · Inauguração',
    description: 'Ato único: nomear os Guardiões e gerar a chave da Cripta.',
  },
  {
    href: '/cripta-administracao/lacracao',
    title: '01 · Recebimento e lacração',
    description: 'Comissão, período de cartas, participação e recibo.',
  },
  {
    href: '/cripta-administracao/reabertura',
    title: '02 · Reabertura',
    description: 'Sessão, conferência do lacre e acesso dos irmãos.',
  },
  {
    href: '/cripta-administracao/abertura-individual',
    title: '03 · Abertura individual',
    description: 'Ocorrência por falecimento ou desligamento.',
  },
];

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const db = getAdminFirestore();
  const [open, governance, receipt] = await Promise.all([
    isOnlineOpen(tenantId),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    db.collection('criptaSealsV1').doc(tenantId).get(),
  ]);
  const data = governance.data();
  const current = receipt.data();
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">
          Cripta · administração
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Estado da Cripta</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Cada ato tem sua própria tela. Consulte a fase, execute o trabalho em sessão e guarde os
          registros fora do Portal.
        </p>
        <p className="mt-6 inline-block rounded-full border border-[#d7b86a] px-4 py-2 text-sm font-semibold">
          {open ? 'Recebimento aberto' : 'Recebimento fechado'}
        </p>
      </header>
      <nav aria-label="Fases da administração" className="grid gap-4 md:grid-cols-3">
        {stages.map((stage) => (
          <Link
            key={stage.href}
            href={stage.href}
            className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6 shadow-sm transition hover:border-[#8a6a1f] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a1f]"
          >
            <strong className="font-serif text-2xl">{stage.title}</strong>
            <span className="mt-3 block text-sm leading-6 text-[#5e584c]">{stage.description}</span>
            <span className="mt-6 block font-semibold text-[#123c69]">Abrir fase →</span>
          </Link>
        ))}
      </nav>
      <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6">
        <h2 className="font-serif text-2xl">Registro do ciclo</h2>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#5e584c]">Comissão</dt>
            <dd className="mt-1 font-semibold">
              {data?.commissionMemberIds?.length
                ? `${data.commissionMemberIds.length} integrante(s) indicado(s)`
                : 'Ainda não nomeada'}
            </dd>
          </div>
          <div>
            <dt className="text-[#5e584c]">Próxima abertura prevista</dt>
            <dd className="mt-1 font-semibold">
              {data?.nextOpeningDate
                ? new Date(`${data.nextOpeningDate}T12:00:00Z`).toLocaleDateString('pt-BR', {
                    timeZone: 'UTC',
                  })
                : 'A definir'}
            </dd>
          </div>
          <div>
            <dt className="text-[#5e584c]">Último recibo</dt>
            <dd className="mt-1 break-all font-mono font-semibold">
              {current?.code ?? 'Ainda não emitido'}
            </dd>
          </div>
          <div>
            <dt className="text-[#5e584c]">Situação registrada</dt>
            <dd className="mt-1 font-semibold">
              {current?.status === 'sealed'
                ? 'Lacre do inventário vigente'
                : 'Aguardando próximo lacre'}
            </dd>
          </div>
        </dl>
        <details className="mt-6 text-sm text-[#725624]">
          <summary className="cursor-pointer font-semibold">? O que este painel comprova?</summary>
          <p className="mt-2 leading-6">
            Mostra registros administrativos do Portal. Um recibo de inventário não comprova, por si
            só, a gravação e a verificação dos pen drives.
          </p>
        </details>
      </section>
    </div>
  );
}
