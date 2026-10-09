import Link from 'next/link';
import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  GraduationCap,
  Settings,
  ShieldCheck,
  Users,
} from '@vl6/ui';
import type { OverviewTask } from '../lib/dashboard-overview-model';

const primaryActions = [
  {
    href: '/admin/publicacoes/novo',
    title: 'Registrar acontecimento',
    description:
      'Comece por aqui. Cadastre uma vez o fato, a data e o local; depois ligue notícia, aviso, fotos, vídeos e documentos ao mesmo registro.',
    icon: CalendarDays,
    emphasis: true,
  },
  {
    href: '/admin/publicacoes',
    title: 'Acompanhar publicações',
    description:
      'Veja acontecimentos em andamento e continue notícia, aviso, Acervo e comunicação sem procurar telas separadas.',
    icon: ShieldCheck,
  },
  {
    href: '#plano-de-acao',
    title: 'Resolver pendências',
    description:
      'Confira vínculos, cadastros incompletos e alertas identificados automaticamente pelo Portal.',
    icon: ArrowUpRight,
  },
  {
    href: '/admin/acervo',
    title: 'Cuidar da memória',
    description:
      'Acesse Acervo e Biblioteca quando precisar catalogar, revisar, organizar ou corrigir registros históricos.',
    icon: Archive,
  },
] as const;

const secondaryActions = [
  { href: '/admin/pessoas', label: 'Pessoas e Loja', icon: Users },
  { href: '/admin/conhecimento', label: 'Conhecimento', icon: GraduationCap },
  { href: '/admin/configuracoes', label: 'Configurações e auditoria', icon: Settings },
] as const;

function taskCount(tasks: OverviewTask[]) {
  return tasks.reduce((sum, task) => sum + (task.count ?? 0), 0);
}

export function AdminStartCenter({ tasks }: { tasks: OverviewTask[] }) {
  const important = tasks
    .filter((task) => task.kind === 'Alerta' || task.kind === 'Pendência')
    .slice(0, 4);
  const total = taskCount(important);

  return (
    <section className="space-y-4" aria-labelledby="admin-start-title">
      <div className="border-border bg-surface overflow-hidden rounded-2xl border">
        <div className="border-b border-border bg-primary px-5 py-5 text-white sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                Administração facilitada
              </p>
              <h2 id="admin-start-title" className="font-display mt-2 text-2xl font-semibold">
                O que você precisa fazer agora?
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/80">
                O Portal passa a trabalhar por fluxo, não por cadastros soltos. Para fatos da Loja,
                registre primeiro o acontecimento e deixe os demais conteúdos dependentes dele.
              </p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right">
              <strong className="font-display block text-2xl tabular-nums">{total}</strong>
              <span className="text-xs text-white/75">itens sinalizados nas filas prioritárias</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4 sm:p-6">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group rounded-xl border p-4 transition-colors ${
                  action.emphasis
                    ? 'border-accent bg-accent/10 hover:bg-accent/15'
                    : 'border-border hover:border-accent hover:bg-accent/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="bg-primary/5 text-primary rounded-lg p-2">
                    <Icon size={19} strokeWidth={1.8} />
                  </span>
                  <ArrowUpRight size={16} className="text-muted group-hover:text-accent" />
                </div>
                <h3 className="mt-4 font-semibold">{action.title}</h3>
                <p className="text-muted mt-2 text-xs leading-relaxed">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div className="border-border bg-surface rounded-2xl border p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold">Fluxo único do acontecimento</h3>
              <p className="text-muted mt-1 text-xs">
                Um dado principal alimenta as áreas relacionadas e reduz cadastros duplicados.
              </p>
            </div>
            <Link href="/admin/publicacoes" className="text-accent text-xs font-medium underline">
              Abrir Central de Publicação
            </Link>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-5">
            {['Acontecimento', 'Notícia e aviso', 'Fotos e vídeos', 'Acervo', 'Memória'].map(
              (label, index) => (
                <div key={label} className="flex items-center gap-2 sm:block">
                  <span className="bg-accent text-primary inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                    {index + 1}
                  </span>
                  <p className="mt-0 text-xs font-medium sm:mt-2">{label}</p>
                </div>
              ),
            )}
          </div>
          <p className="text-muted mt-4 text-xs leading-relaxed">
            Datas, local, gestão e vínculos devem nascer do acontecimento. Notícias e mídias deixam de
            ser ilhas e passam a compor automaticamente a mesma memória sempre que houver vínculo seguro.
          </p>
        </div>

        <div className="border-border bg-surface rounded-2xl border p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold">Acesso rápido</h3>
          <nav className="mt-3 space-y-2" aria-label="Acessos administrativos rápidos">
            {secondaryActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="border-border hover:border-accent hover:bg-accent/5 flex items-center gap-3 rounded-xl border px-3 py-3 text-sm"
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span className="flex-1">{action.label}</span>
                  <ArrowUpRight size={14} className="text-muted" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {important.length > 0 && (
        <div className="border-border bg-surface rounded-2xl border p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold">Pendências que merecem atenção</h3>
              <p className="text-muted mt-1 text-xs">
                Atalhos para as filas já identificadas pelo próprio Portal.
              </p>
            </div>
            <a href="#plano-de-acao" className="text-accent text-xs font-medium underline">
              Ver todas
            </a>
          </div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {important.map((task) => (
              <Link
                key={`${task.href}-${task.label}`}
                href={task.href}
                className="border-border hover:border-accent flex items-start gap-3 rounded-xl border p-3"
              >
                <span className="bg-accent/10 text-accent min-w-10 rounded-lg px-2 py-1.5 text-center text-sm font-semibold tabular-nums">
                  {task.count ?? '—'}
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm">{task.label}</strong>
                  <span className="text-muted mt-1 block text-xs leading-relaxed">{task.detail}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
