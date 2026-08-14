'use client';

import { useState, type KeyboardEvent } from 'react';
import { Input, X } from '@vl6/ui';

export function TagInput({
  name,
  defaultValue = [],
  max = 10,
  placeholder,
}: {
  name: string;
  defaultValue?: string[];
  max?: number;
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState('');

  function addTag() {
    const value = draft.trim();
    if (!value || tags.length >= max || tags.includes(value)) {
      setDraft('');
      return;
    }
    setTags((current) => [...current, value]);
    setDraft('');
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="bg-accent/15 text-primary-dark flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remover ${tag}`}
              onClick={() => setTags((current) => current.filter((t) => t !== tag))}
              className="hover:text-primary"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {tags.length < max && (
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={placeholder}
        />
      )}
      <p className="text-muted text-xs">
        {tags.length}/{max} — Enter ou vírgula para adicionar.
      </p>
      <input type="hidden" name={name} value={JSON.stringify(tags)} />
    </div>
  );
}
