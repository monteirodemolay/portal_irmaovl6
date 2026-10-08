'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ComponentProps } from 'react';
import { contextualHref, resolveOrigin } from '@/lib/navigation/context';

export function useNavigationOrigin() {
  const search = useSearchParams();
  return resolveOrigin(search.get('from'));
}

export default function ContextLink(props: ComponentProps<typeof Link>) {
  return (
    <Suspense fallback={<Link {...props} />}>
      <ContextLinkContent {...props} />
    </Suspense>
  );
}

function ContextLinkContent({ href, onClick, ...props }: ComponentProps<typeof Link>) {
  const pathname = usePathname();
  const search = useSearchParams();
  const inherited = useNavigationOrigin();
  const [current, setCurrent] = useState(pathname);
  useEffect(() => {
    setCurrent(window.location.pathname + window.location.search + window.location.hash);
  }, [pathname, search]);
  const target =
    typeof href === 'string' ? contextualHref(href, inherited ?? resolveOrigin(current)) : href;
  return (
    <Link
      {...props}
      href={target}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        try {
          sessionStorage.setItem('vl6:return:' + current, String(window.scrollY));
        } catch {
          /* Storage is optional. */
        }
      }}
    />
  );
}

function ContextReturnContent({
  fallbackHref,
  fallbackLabel,
  title,
}: {
  fallbackHref: string;
  fallbackLabel: string;
  title?: string;
}) {
  const origin = useNavigationOrigin();
  const href = origin?.href ?? fallbackHref;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <Link
          href={href}
          scroll={false}
          onClick={() => {
            try {
              sessionStorage.setItem('vl6:restore', href);
            } catch {
              /* Storage is optional. */
            }
          }}
          className="text-primary text-sm font-semibold hover:underline"
        >
          ← {origin ? `Voltar ao ${origin.label}` : fallbackLabel}
        </Link>
        {origin && title && (
          <nav aria-label="Caminho de navegação" className="text-muted mt-3 text-sm">
            <Link href={href}>{origin.label}</Link> › <span>{title}</span>
          </nav>
        )}
      </div>
      {origin && origin.module !== '/noticias' && fallbackHref === '/noticias' && (
        <Link href="/noticias" className="text-primary text-sm hover:underline">
          Todas as notícias →
        </Link>
      )}
    </div>
  );
}

export function ContextReturn(props: {
  fallbackHref: string;
  fallbackLabel: string;
  title?: string;
}) {
  return (
    <Suspense fallback={<Link href={props.fallbackHref}>{props.fallbackLabel}</Link>}>
      <ContextReturnContent {...props} />
    </Suspense>
  );
}
