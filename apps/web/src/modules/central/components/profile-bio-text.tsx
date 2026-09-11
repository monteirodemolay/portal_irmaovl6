'use client';

import { useState } from 'react';

/**
 * Biografia com recolhimento inicial (5-6 linhas) — Central VL6 é uma página
 * institucional/de comunidade, não um formulário; textos longos precisam de
 * "Ler mais" para não dominar a coluna principal.
 */
export function ProfileBioText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2">
      <p
        className={
          expanded
            ? 'whitespace-pre-line text-sm leading-relaxed'
            : 'line-clamp-6 whitespace-pre-line text-sm leading-relaxed'
        }
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="text-accent text-xs font-semibold hover:underline"
      >
        {expanded ? 'Recolher ↑' : 'Ler biografia completa ↓'}
      </button>
    </div>
  );
}
