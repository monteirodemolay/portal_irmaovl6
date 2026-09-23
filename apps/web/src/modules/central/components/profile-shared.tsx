import Link from 'next/link';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { getBoardPositionLabel } from '@vl6/shared';
import {
  Panel as InstitutionalPanel,
  type IconType,
} from '@/components/membership/institutional-panel';

/** Tabs de Meu Espaço que cada bloco do perfil edita. */
export type EditTab =
  'geral' | 'pessoal' | 'profissional' | 'empresa' | 'afiliacoes' | 'contatos' | 'redes';

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(date));
}

/**
 * "23/11", nunca o ano — mesma convenção de privacidade usada pro
 * aniversário natalício do próprio Irmão (nunca expõe idade). Usado pro
 * aniversário da cônjuge, que pode vir só como dia/mês quando o ano não é
 * conhecido (`PublicMemberProfileDTO['informacoesPessoais'].conjuge`).
 */
export function formatDayMonth(dia: number, mes: number): string {
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}`;
}

const COMPACT_MONTH_LABELS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/**
 * Data compacta em uma linha só ("23 nov 2003") pra linha do tempo
 * "Caminho na Loja" — `formatDate`/`dateStyle: 'long'` ("23 de novembro de
 * 2003") quebra em duas linhas na coluna estreita da data, pedido explícito
 * do Administrador pra deixar a trajetória "mais fluída e proporcional".
 */
export function formatCompactDate(date: Date): string {
  const d = new Date(date);
  return `${d.getDate()} ${COMPACT_MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Quantos dias faltam pro próximo aniversário de `date` (só mês/dia
 * importam, o ano é ignorado) — usado pra ordenar a lista de Família e
 * Legado do mais próximo de acontecer ao mais longe (pedido do
 * Administrador). Sempre não-negativo: hoje mesmo conta como `0`.
 */
export function daysUntilNextOccurrence(date: Date, today: Date = new Date()): number {
  const todayStripped = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(todayStripped.getFullYear(), date.getMonth(), date.getDate());
  if (next < todayStripped) {
    next = new Date(todayStripped.getFullYear() + 1, date.getMonth(), date.getDate());
  }
  return Math.round((next.getTime() - todayStripped.getTime()) / 86_400_000);
}

/**
 * Cargo ou comissão em curso — vira o selo de "gestão atual" no cabeçalho.
 * Prioriza cargo sobre comissão quando os dois estão em aberto.
 */
export function getCurrentAssignment(trajetoria: PublicMemberProfileDTO['trajetoria']) {
  if (!trajetoria) return null;
  const activeCargo = trajetoria.cargos.find((entry) => !entry.dataFim);
  if (activeCargo) {
    return { label: getBoardPositionLabel(activeCargo.cargo), gestaoNome: activeCargo.gestaoNome };
  }
  const activeComissao = trajetoria.comissoes.find((entry) => !entry.dataFim);
  if (activeComissao) {
    return { label: activeComissao.nome, gestaoNome: activeComissao.gestaoNome };
  }
  return null;
}

/**
 * Adapta o `Panel` institucional compartilhado (`@/components/membership/
 * institutional-panel`, mesma peça visual usada pela Pessoa do Acervo VL6)
 * pro vocabulário específico da Central VL6: `editTab` vira o link "Editar"
 * pra aba certa de Meu Espaço, sem cada seção precisar montar esse `Link`
 * na mão. Compartilhado entre as 4 seções do Perfil único (Visão Geral /
 * Trajetória e Honrarias / Família e Legado / Acervo, empilhadas numa
 * página só) — antes vivia só dentro de `public-member-profile-view.tsx`.
 */
export function Panel({
  editTab,
  trailing,
  ...props
}: {
  id?: string;
  kicker: string;
  title: string;
  icon?: IconType;
  editTab?: EditTab;
  trailing?: React.ReactNode;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <InstitutionalPanel
      {...props}
      trailing={
        trailing ??
        (editTab && (
          <Link
            href={`/irmaos/meu-espaco?tab=${editTab}`}
            className="text-accent shrink-0 text-xs font-semibold hover:underline"
          >
            Editar
          </Link>
        ))
      }
    />
  );
}

export function LinkPill({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: IconType;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="border-border bg-background hover:border-primary hover:text-primary flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
    >
      <Icon size={15} strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </a>
  );
}

export function SummaryRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  /** Quando informado, `value` vira um link (ex. pra página de um negócio publicado). */
  href?: string;
}) {
  return (
    <div className="border-border flex items-center justify-between gap-3 border-b border-dashed pb-2.5 last:border-0 last:pb-0">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="text-right text-xs font-semibold">
        {href ? (
          <Link href={href} className="text-accent hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
