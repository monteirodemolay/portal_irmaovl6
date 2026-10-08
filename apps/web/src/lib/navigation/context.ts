export interface NavigationOrigin { href: string; label: string; module: string }
const modules = [
  ['/acervo', 'Acervo VL6'], ['/conhecimento', 'Conhecimento VL6'],
  ['/noticias', 'Notícias'], ['/dashboard', 'Início'], ['/agenda', 'Minha Agenda'],
  ['/irmaos', 'Irmãos'], ['/paramaconicas', 'Paramaçônicas'],
] as const;

export function resolveOrigin(value: string | null): NavigationOrigin | null {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\r\n]/.test(value)) return null;
  const url = new URL(value, 'https://portal.invalid');
  if (url.origin !== 'https://portal.invalid') return null;
  const originModule = modules.find(([path]) => url.pathname === path || url.pathname.startsWith(`${path}/`));
  if (!originModule) return null;
  url.searchParams.delete('from');
  return { href: url.pathname + url.search + url.hash, module: originModule[0], label: originModule[1] };
}

export function contextualHref(target: string, origin: NavigationOrigin | null): string {
  if (!origin || !target.startsWith('/') || target.startsWith('//')) return target;
  const url = new URL(target, 'https://portal.invalid');
  if (['/acervo/biblioteca/carrinho', '/acervo/biblioteca/emprestimos', '/irmaos/meu-espaco', '/irmaos/negocios', '/irmaos/galeria-de-honra'].includes(url.pathname)) return target;
  // Lists and explicit module changes start a new journey; details preserve it.
  if (!/^\/(noticias|acervo\/(eventos|biblioteca|pessoas|gestoes)|irmaos|conhecimento\/formacoes)\/[^/]+/.test(url.pathname)) return target;
  url.searchParams.set('from', origin.href);
  return url.pathname + url.search + url.hash;
}
