import { withCriptaOperation } from '@/modules/cripta/lib/reset-control';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import { createServerContainer, getAdminFirestore } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';

export const maxDuration = 300;

export const metadata = {
  title: 'Abertura individual | Cripta VL6',
  robots: { index: false, follow: false },
};

async function registerEvent(data: FormData) {
  'use server';
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  await withCriptaOperation(tenantId, async () => {
    const memberId = String(data.get('memberId') ?? '');
    const reason = String(data.get('reason') ?? '');
    const minutes = String(data.get('minutes') ?? '').trim();
    const reference = String(data.get('reference') ?? '').trim();
    if (
      !['falecimento', 'desligamento'].includes(reason) ||
      minutes.length < 5 ||
      minutes.length > 160 ||
      reference.length < 5 ||
      reference.length > 160
    ) {
      redirect('/cripta-administracao/abertura-individual?erro=campos');
    }
    const member = await createServerContainer().repositories.member.findById(memberId);
    if (!member || member.tenantId !== tenantId)
      redirect('/cripta-administracao/abertura-individual?erro=irmao');
    const event = {
      tenantId,
      memberId,
      memberName: member.nomeCompleto,
      reason,
      minutes,
      reference,
      status: 'registrado',
      at: new Date().toISOString(),
      operatorId: session.user.id,
    };
    await getAdminFirestore()
      .collection('criptaIndividualEventsV2')
      .doc(randomUUID())
      .create(event);
  });
  revalidatePath('/cripta-administracao/abertura-individual');
  redirect('/cripta-administracao/abertura-individual?registro=feito');
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; registro?: string }>;
}) {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const [members, events, params] = await Promise.all([
    createServerContainer().repositories.member.search({ tenantId }, { limit: 100 }),
    getAdminFirestore()
      .collection('criptaIndividualEventsV2')
      .where('tenantId', '==', tenantId)
      .get(),
    searchParams,
  ]);
  const recent = events.docs
    .map(
      (doc) =>
        ({ id: doc.id, ...doc.data() }) as {
          id: string;
          memberName: string;
          reason: string;
          minutes: string;
          status: string;
          at: string;
        },
    )
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);
  const input = 'mt-2 w-full rounded-xl border border-[#c9b98f] bg-white p-3 text-[#17263f]';
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
          Cripta · fase 03
        </p>
        <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Abertura individual</h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Registre a ocorrência e a decisão em sessão. A entrega e a retirada do pacote lacrado são
          atos distintos, com nova lacração ao final.
        </p>
      </header>
      <section className="rounded-2xl border border-[#d8c8a4] bg-[#fffdf8] p-6">
        <h2 className="font-serif text-2xl">1 · Registrar ocorrência</h2>
        <p className="mt-2 text-sm text-[#5e584c]">
          Esta etapa registra somente metadados administrativos. Não anexe certidão ou carta aqui.
        </p>
        {params.erro && (
          <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-900">
            Revise o irmão, a ata e a referência do documento.
          </p>
        )}
        {params.registro && (
          <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900">
            Ocorrência registrada no histórico.
          </p>
        )}
        <form action={registerEvent} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">
            Irmão
            <select name="memberId" required className={input}>
              <option value="">Selecione</option>
              {members.items.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.nomeCompleto}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Motivo
            <select name="reason" required className={input}>
              <option value="">Selecione</option>
              <option value="falecimento">Falecimento</option>
              <option value="desligamento">Desligamento</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Ata da deliberação
            <input
              name="minutes"
              required
              minLength={5}
              maxLength={160}
              className={input}
              placeholder="Ex.: Ata 126/2026"
            />
          </label>
          <label className="text-sm font-semibold">
            Referência da comprovação
            <input
              name="reference"
              required
              minLength={5}
              maxLength={160}
              className={input}
              placeholder="Ex.: documento conferido em sessão"
            />
          </label>
          <button className="rounded-xl bg-[#123c69] px-5 py-3 font-semibold text-white sm:col-span-2 sm:justify-self-start">
            Registrar ocorrência
          </button>
        </form>
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer font-semibold">
            ? Esse registro já libera as cartas?
          </summary>
          <p className="mt-2">
            Não. A Comissão ainda precisa autorizar a extração, conferir o destinatário indicado,
            entregar e relacrar o arquivo sem os dados retirados.
          </p>
        </details>
      </section>
      <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6">
        <h2 className="font-serif text-2xl">2 · Autorização, entrega e nova lacração</h2>
        <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-6 text-[#5e584c]">
          <li>Conferir o documento e a ata fora do Portal.</li>
          <li>Identificar as cartas do irmão no inventário lacrado.</li>
          <li>Extrair apenas as cartas desse código na ferramenta offline.</li>
          <li>Registrar o destinatário e a entrega em termo assinado.</li>
          <li>Relacrar o restante com chave, manifestos e termo novos.</li>
        </ol>
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">
          A exportação individual e a relacração ainda não estão conectadas aos dados do Portal. Não
          use este registro como prova de entrega ou exclusão.
        </p>
      </section>
      <section className="rounded-2xl border border-[#d8c8a4] bg-white p-6">
        <h2 className="font-serif text-2xl">Histórico de ocorrências</h2>
        {recent.length ? (
          <ul className="mt-4 divide-y">
            {recent.map((event) => (
              <li key={event.id} className="py-3 text-sm">
                <strong>{event.memberName}</strong> · {event.reason} · {event.minutes}
                <span className="block text-[#5e584c]">
                  {new Date(event.at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} ·{' '}
                  {event.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[#5e584c]">Nenhuma ocorrência registrada.</p>
        )}
      </section>
    </div>
  );
}
