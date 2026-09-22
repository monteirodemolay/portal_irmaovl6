'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Select } from '@vl6/ui';
import { UnderlineTabs } from './underline-tabs';

export interface TabNavItem {
  href: string;
  label: string;
}

function isTabActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra de abas horizontal para sub-navegação dentro de uma área admin
 * consolidada (ex.: `/admin/pessoas`). Vive em `apps/web`, não em
 * `packages/ui`, pelo mesmo motivo do `AppShell`: depende de `next/link`/
 * `usePathname`, e o design system é framework-agnostic. Mesma regra de
 * "ativo" do `AppShell.isActive` — quem chama (`AreaTabNav`) já filtra
 * `items` pela permissão da sessão antes de passar aqui.
 *
 * Quando um `href` é prefixo de outro (ex.: `/irmaos` e `/irmaos/meu-espaco`),
 * mais de um item bateria em `isTabActive` ao mesmo tempo — só o `href` mais
 * específico (o mais longo) fica marcado como ativo.
 */
export function TabNav({ items }: { items: TabNavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = items
    .filter((item) => isTabActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      <div className="border-border w-full border-b py-3 md:hidden print:hidden">
        <label className="text-muted mb-1.5 block text-xs font-medium" htmlFor="admin-area-section">
          Seção desta área
        </label>
        <Select
          id="admin-area-section"
          aria-label="Selecionar seção desta área"
          value={activeHref ?? items[0]?.href ?? ''}
          onChange={(event) => router.push(event.target.value)}
          className="w-full"
        >
          {items.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </Select>
      </div>
      <UnderlineTabs
        items={items}
        activeHref={activeHref}
        ariaLabel="Sub-navegação"
        className="hidden md:block print:hidden"
      />
    </>
  );
}
