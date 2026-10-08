'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { matchSearchSuggestions, type SearchSuggestion } from '@vl6/shared';
import Link from '@/components/layout/context-link';

type Props = Omit<ComponentProps<'form'>, 'action'> & {
  action?: string;
  suggestions?: SearchSuggestion[];
  autoNavigate?: boolean;
};

/** Preloaded suggestions stay local to the authorized page; full results use its existing server route. */
export function LiveSearchForm({
  children,
  action,
  suggestions = [],
  autoNavigate = true,
  ...props
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composing = useRef(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const statusId = useId();
  const matches = matchSearchSuggestions(suggestions, query);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function navigate(form: HTMLFormElement, immediate: boolean) {
    if (timer.current) clearTimeout(timer.current);
    const url = new URL(action || window.location.pathname, window.location.origin);
    if (url.origin !== window.location.origin) return;
    const params = new URLSearchParams(window.location.search);
    // Replace fields owned by this form, preserving unrelated filters and contextual origin.
    for (const control of Array.from(form.elements)) {
      if ('name' in control && typeof control.name === 'string' && control.name)
        params.delete(control.name);
    }
    for (const [name, value] of new FormData(form)) {
      if (typeof value === 'string' && value.trim()) params.append(name, value.trim());
    }
    for (const key of ['pagina', 'page', 'cursor']) params.delete(key);
    url.search = params.toString();
    const href = url.pathname + url.search;
    const run = () => {
      if (href === window.location.pathname + window.location.search) return;
      startTransition(() => router.replace(href, { scroll: false }));
    };
    if (immediate) run();
    else timer.current = setTimeout(run, 350);
  }

  function changed(event: FormEvent<HTMLFormElement>) {
    const input = event.currentTarget.querySelector<HTMLInputElement>('[name="q"]');
    setQuery(input?.value ?? '');
    setOpen(true);
    if (autoNavigate && !composing.current) navigate(event.currentTarget, false);
  }

  return (
    <form
      {...props}
      ref={formRef}
      action={action}
      method="get"
      aria-describedby={statusId}
      onChange={(event) => {
        props.onChange?.(event);
        if (!event.defaultPrevented) changed(event);
      }}
      onCompositionStart={() => {
        composing.current = true;
      }}
      onCompositionEnd={(event) => {
        composing.current = false;
        changed(event);
      }}
      onSubmit={(event) => {
        props.onSubmit?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
        setOpen(false);
        navigate(event.currentTarget, true);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (
          event.key === 'ArrowDown' &&
          event.target instanceof HTMLInputElement &&
          event.target.name === 'q'
        ) {
          const first = formRef.current?.querySelector<HTMLAnchorElement>(
            '[data-search-suggestion]',
          );
          if (first) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      {children}
      <div className="col-span-full basis-full" id={statusId} role="status" aria-live="polite">
        {pending && <p className="text-muted mt-2 text-xs">Atualizando resultados…</p>}
      </div>
      {open && query.trim() && matches.length > 0 && (
        <nav
          aria-label="Resultados imediatos da pesquisa"
          className="border-border bg-surface col-span-full mt-2 w-full basis-full rounded-xl border p-2 shadow-sm"
        >
          <p className="text-muted px-3 py-1 text-xs">
            Resultados disponíveis enquanto você digita
          </p>
          <ul>
            {matches.map((item, index) => (
              <li key={`${item.href}:${index}`}>
                <Link
                  href={item.href}
                  onClick={() => {
                    if (timer.current) clearTimeout(timer.current);
                    setOpen(false);
                  }}
                  data-search-suggestion
                  className="hover:bg-accent/10 focus-visible:ring-accent block rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </form>
  );
}
