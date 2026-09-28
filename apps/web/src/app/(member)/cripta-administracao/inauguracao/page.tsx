import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requirePagePermission } from '@/lib/auth/require-permission';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { currentCriptaMaster } from '@/modules/cripta/lib/current-master';
import { readCriptaPublicKey } from '@/modules/cripta/lib/cripta-crypto-state';
import { InaugurationPanel } from '../inauguration-panel';

export const metadata = {
  title: 'Inauguração da Cripta | Cripta VL6',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const session = await requirePagePermission('tenant:manage');
  if (!canAccessCriptaPilot(session.user.email)) notFound();
  const tenantId = session.authContext.tenantId;
  const [members, master, existing] = await Promise.all([
    createServerContainer().repositories.member.search(
      { tenantId, situacao: 'ativo' },
      { limit: 100 },
    ),
    currentCriptaMaster(tenantId),
    readCriptaPublicKey(tenantId),
  ]);
  const eligible = members.items
    .filter((member) => member.userId && member.id !== master?.member.id)
    .map((member) => ({ id: member.id, name: member.nomeCompleto }));
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
          Cripta · fundação
        </p>
        <h1 className="mt-4 font-serif text-4xl">Inauguração da Cripta</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-200">
          Ato único, em sessão fechada: nomeia os Guardiões da Cripta e gera a chave que vai
          proteger todas as cartas, sem que ninguém — nem a própria Loja — precise guardar uma senha
          por Irmão.
        </p>
      </header>
      {!master && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-900">
          Cadastre o Venerável Mestre na gestão vigente e vincule sua conta antes de abrir esta
          sessão.
        </p>
      )}
      <InaugurationPanel
        eligible={eligible}
        existing={existing}
        masterName={master?.member.nomeCompleto ?? ''}
      />
    </div>
  );
}
