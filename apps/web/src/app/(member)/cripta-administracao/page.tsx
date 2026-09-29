import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { isOnlineOpen } from '@/modules/cripta/lib/online-opening';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';

export const metadata = {
  title: 'Estado da Cripta | Portal VL6',
  robots: { index: false, follow: false },
};

const cycleStages = [
  {
    href: '/cripta-administracao/lacracao',
    title: 'Lacração — etapas 1, 3, 4, 5, 6 e 7',
    description:
      'Comissão e data, fechar o recebimento, gerar o recibo, exportar para as 3 unidades, conferir e só então limpar o Wix.',
  },
  {
    href: '/cripta-administracao/reabertura',
    title: 'Reabertura — etapas 6 (confirmar), 8 e 2',
    description:
      'Confirmar a conferência, restaurar os rascunhos do mesmo pen drive e reabrir o recebimento (etapa 2) para o próximo ciclo.',
  },
];

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const db = getAdminFirestore();
  const [open, governance, receipt, inauguration] = await Promise.all([
    isOnlineOpen(tenantId),
    db.collection('criptaGovernanceV1').doc(tenantId).get(),
    db.collection('criptaSealsV1').doc(tenantId).get(),
    readCriptaPublicKey(tenantId),
  ]);
  const data = governance.data();
  const current = receipt.data();
  const inaugurated = !!inauguration;
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12 text-[#17263f]">
      <header className="rounded-[2rem] border border-[#c9a55a] bg-[#17263f] p-8 text-white sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.22em] text-[#e3bd62]">
          Cripta · administração
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Estado da Cripta</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          A inauguração acontece uma única vez. Depois dela, um ciclo de 8 etapas se repete a cada
          ano, em duas telas. Um processo à parte, mais abaixo, cobre óbito ou desligamento.
        </p>
        <p className="mt-6 inline-block rounded-full border border-[#d7b86a] px-4 py-2 text-sm font-semibold">
          {open ? 'Recebimento aberto' : 'Recebimento fechado'}
        </p>
      </header>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
          Antes de tudo · uma vez só
        </p>
        <Link
          href="/cripta-administracao/inauguracao"
          className="mt-2 block rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6 shadow-sm transition hover:border-[#8a6a1f] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a1f]"
        >
          <strong className="font-serif text-2xl">Inauguração</strong>
          <span className="mt-3 block text-sm leading-6 text-[#5e584c]">
            Nomear os Guardiões e gerar a chave da Cripta.
          </span>
          <span className="mt-4 block font-semibold text-[#123c69]">
            {inaugurated ? 'Já feita — ver registro →' : 'Fazer agora →'}
          </span>
        </Link>
      </section>

      <section>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8a682d]">
          O ciclo anual · se repete a cada abertura
        </p>
        <p className="mt-1 text-sm text-[#5e584c]">
          Comece sempre pela Lacração. Só depois de lacrar, exportar, conferir e limpar o Wix é que
          a Reabertura libera a próxima janela de escrita.
        </p>
        <nav
          aria-label="Telas do ciclo anual, na ordem de uso"
          className="mt-3 grid gap-4 md:grid-cols-2"
        >
          {cycleStages.map((stage) => (
            <Link
              key={stage.href}
              href={stage.href}
              className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6 shadow-sm transition hover:border-[#8a6a1f] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a6a1f]"
            >
              <strong className="font-serif text-2xl">{stage.title}</strong>
              <span className="mt-3 block text-sm leading-6 text-[#5e584c]">
                {stage.description}
              </span>
              <span className="mt-6 block font-semibold text-[#123c69]">Abrir tela →</span>
            </Link>
          ))}
        </nav>
      </section>

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
