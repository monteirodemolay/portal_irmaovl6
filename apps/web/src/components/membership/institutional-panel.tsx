import Link from 'next/link';

export type IconType = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
}>;

/**
 * Painel institucional — kicker + título serif, ícone opcional e uma área
 * de ação livre (`trailing`, tipicamente um link "Editar" ou "Ver mais").
 * Unidade visual compartilhada entre o Perfil do Irmão
 * (`public-member-profile-view.tsx`) e a Pessoa do Acervo VL6
 * (`acervo/pessoas/[memberId]/page.tsx`) — as duas telas mostram a mesma
 * pessoa institucional, só com recortes de dados diferentes (ver
 * docs/architecture/11-acervo-vl6.md §11.6c). `compact` reduz peso
 * tipográfico para colunas laterais.
 */
export function Panel({
  kicker,
  title,
  icon: Icon,
  trailing,
  compact = false,
  children,
}: {
  kicker: string;
  title: string;
  icon?: IconType;
  trailing?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <article className="border-border bg-surface flex flex-col gap-4 rounded-2xl border p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-muted text-[10px] font-bold tracking-[0.14em]">{kicker}</p>
          <h2
            className={
              compact
                ? 'font-display mt-1 text-base font-semibold'
                : 'font-display mt-1 text-lg font-semibold'
            }
          >
            {title}
          </h2>
        </div>
        {trailing ??
          (Icon ? (
            <Icon size={16} strokeWidth={1.75} className="text-accent mt-1 shrink-0" />
          ) : null)}
      </div>
      {children}
    </article>
  );
}

/**
 * Uma entrada da linha do tempo institucional (iniciação/elevação/
 * exaltação, cargo, comissão) — ponto sólido dourado quando em curso
 * (`active`), contorno vazado quando encerrado. Mesma peça visual em
 * "Caminho na Loja" (Perfil do Irmão) e "Trajetória institucional"
 * (Pessoa do Acervo VL6). `href` opcional — cargo/comissão levam pra Gestão
 * (`/acervo/gestoes/[gestaoId]`), iniciação/elevação/exaltação pro Evento da
 * sessão (`/acervo/eventos/[eventId]`) quando encontrado; sem `href`, a
 * entrada fica só como texto.
 *
 * `current` é distinto de `active`: marca o que o Irmão É agora mesmo (só
 * cargo/comissão em curso, nunca uma cerimônia — Iniciação/Elevação/
 * Exaltação são fatos únicos, não um estado atual) com um sinal amarelo
 * piscando (`animate-ping`) e um selo "Atual", pedido explícito do
 * Administrador pra diferenciar de bater o olho e não saber se aquele é o
 * cargo de hoje ou só um marco histórico já encerrado.
 */
export function TimelineEntry({
  label,
  detail,
  dateLabel,
  active = false,
  current = false,
  href,
}: {
  label: string;
  detail?: string;
  dateLabel: string;
  active?: boolean;
  current?: boolean;
  href?: string;
}) {
  const content = (
    <div className="grid grid-cols-[16px_92px_1fr] items-start gap-3">
      <span className="relative mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center">
        {current && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75" />
        )}
        <span
          className={
            current
              ? 'relative h-3.5 w-3.5 rounded-full bg-yellow-400'
              : active
                ? 'bg-accent h-3.5 w-3.5 rounded-full'
                : 'border-border h-3.5 w-3.5 rounded-full border-2 bg-transparent'
          }
        />
      </span>
      <span className="text-muted text-[10px] font-bold uppercase tabular-nums">{dateLabel}</span>
      <div>
        <p
          className={
            href
              ? 'flex items-center gap-2 text-sm font-semibold hover:underline'
              : 'flex items-center gap-2 text-sm font-semibold'
          }
        >
          {label}
          {current && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-yellow-700">
              Atual
            </span>
          )}
        </p>
        {detail && <p className="text-muted text-xs">{detail}</p>}
      </div>
    </div>
  );

  if (!href) return content;
  return (
    <Link href={href} className="hover:bg-background -m-1 block rounded-lg p-1 transition-colors">
      {content}
    </Link>
  );
}
