export interface NavigationTarget {
  href: string;
  activePaths?: string[];
}

/** Only the most specific route wins; root entries never select every page. */
export function resolveActiveNavigation<T extends NavigationTarget>(
  items: readonly T[],
  location: string,
): T | undefined {
  const pathname = location.split(/[?#]/, 1)[0] ?? '';
  let selected: T | undefined;
  let specificity = -1;
  for (const item of items) {
    for (const target of [item.href, ...(item.activePaths ?? [])]) {
      const route = target.split(/[?#]/, 1)[0] ?? '';
      const matches = pathname === route ||
        (route !== '/' && route !== '/admin' && pathname.startsWith(`${route}/`));
      if (matches && route.length > specificity) {
        selected = item;
        specificity = route.length;
      }
    }
  }
  return selected;
}
