import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PageHero } from '@vl6/ui';
import { requireSession } from '@/lib/auth/require-session';
import { buildAdvancedGroups } from '@/modules/admin/lib/admin-workspace';

export const metadata = { title: 'Administração avançada · Administração VL6' };

/**
 * Ferramentas de uso eventual (migrações, conferências, lixeiras,
 * diagnóstico, ensaios e sistema). Saíram do menu do dia a dia, mas
 * continuam todas acessíveis daqui — a lista vem do registro único
 * `ADMIN_TOOLS`, filtrada pela sessão.
 */
export default async function AdministracaoAvancadaPage() {
  const session = await requireSession();
  const groups = buildAdvancedGroups(session.authContext, session.role);
  if (groups.length === 0) notFound();

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <PageHero
        kicker="Uso eventual"
        title="Administração avançada"
        description="Migrações, conferências, lixeiras, diagnóstico e configurações do sistema. Cada ferramenta mantém suas conferências e confirmações antes de executar."
      />
      {groups.map((group, index) => (
        <section
          key={group.section}
          aria-labelledby={`avancado-${index}`}
          className="flex flex-col gap-3"
        >
          <h2 id={`avancado-${index}`} className="font-display text-xl font-semibold">
            {group.section}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="border-border bg-surface hover:border-primary/40 focus-visible:ring-accent flex min-h-24 flex-col gap-1 rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2"
              >
                <span className="text-muted text-[11px] font-semibold uppercase tracking-wide">
                  {item.areaTitle}
                </span>
                <span className="font-semibold">{item.label}</span>
                {item.description ? (
                  <span className="text-muted text-sm leading-6">{item.description}</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
