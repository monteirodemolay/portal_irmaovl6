import Link from 'next/link';
import { Pencil, Settings } from '@vl6/ui';
import type { EditTab } from './profile-shared';

const ITEMS: Array<{ key: EditTab; label: string }> = [
  { key: 'geral', label: 'Apresentação' },
  { key: 'pessoal', label: 'Pessoal e família' },
  { key: 'profissional', label: 'Profissional' },
  { key: 'empresa', label: 'Negócios' },
  { key: 'afiliacoes', label: 'Afiliações' },
  { key: 'contatos', label: 'Contatos' },
  { key: 'redes', label: 'Redes' },
];

export function OwnerProfileEditBar({ current }: { current?: EditTab | null }) {
  return (
    <div className="border-border bg-surface flex flex-col gap-3 rounded-2xl border p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="text-primary flex shrink-0 items-center gap-2 px-2 text-xs font-bold uppercase tracking-wide">
        <Pencil size={14} />
        Editar meus dados
      </div>
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={`?editar=${item.key}#editor-${item.key}`}
            className={
              current === item.key
                ? 'bg-primary text-primary-foreground shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold'
                : 'border-border bg-background hover:border-primary hover:text-primary shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
      <Link
        href="/configuracoes#perfil-diretorio"
        className="text-muted hover:text-primary flex shrink-0 items-center gap-1.5 px-2 text-xs font-medium transition-colors"
      >
        <Settings size={14} />
        Privacidade
      </Link>
    </div>
  );
}
