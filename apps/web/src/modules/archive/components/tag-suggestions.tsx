'use client';

import type { RefObject } from 'react';

/**
 * Chips com as tags já usadas em outras fichas de catalogação — clicar
 * acrescenta a tag ao campo (sem duplicar), ajudando o Administrador a
 * reaproveitar a mesma grafia em vez de criar uma variante nova
 * ("Sessão Magna" vs "sessão magna"). Sugestão apenas: nada é aplicado sem
 * o clique humano.
 */
export function TagSuggestions({
  existingTags,
  inputRef,
}: {
  existingTags: string[];
  inputRef: RefObject<HTMLInputElement | null>;
}) {
  if (existingTags.length === 0) return null;

  function addTag(tag: string) {
    const input = inputRef.current;
    if (!input) return;
    const current = input.value
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    if (current.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    input.value = [...current, tag].join(', ');
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted text-xs">Tags já usadas — clique para reaproveitar:</p>
      <div className="flex flex-wrap gap-1.5">
        {existingTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => addTag(tag)}
            className="border-border hover:border-accent hover:text-accent rounded-full border px-2.5 py-0.5 text-xs transition-colors"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
