import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/require-session';
import { createServerContainer } from '@vl6/infra';
import { canAccessCriptaPilot } from '@/modules/cripta/lib/early-access';
import { CriptaExperience } from '../cripta-experience';

export const metadata = { title: 'Minhas cartas | Cripta VL6', robots: { index: false, follow: false } };

export default async function Page() {
  const session = await requireSession();
  const member = await createServerContainer().repositories.member.findByUserId(session.authContext.tenantId, session.user.id);
  if (member?.situacao !== 'ativo' || !canAccessCriptaPilot(session.user.email)) notFound();
  return <div className="space-y-4"><Link href="/cripta/painel" className="mx-auto block max-w-5xl text-sm font-semibold text-[#123c69]">← Painel da Cripta</Link><CriptaExperience /></div>;
}
