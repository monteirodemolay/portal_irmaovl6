// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Announcement } from '@vl6/domain';
import { AvisosCard } from './avisos-card';

let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  host?.remove();
  root = undefined;
});
async function click(container: Element, text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  );
  expect(button).toBeDefined();
  await act(() => button!.click());
}
it('mantém todos os avisos na inicial e abre lista e leitura completa em drawer próprio', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const announcements = Array.from({ length: 4 }, (_, i) => ({
    id: `a${i}`,
    titulo: `Comunicado ${i + 1}`,
    descricao: `Texto completo ${i + 1}`,
    destacar: false,
    prioridade: 'media',
    dataExpiracao: null,
    dataPublicacao: null,
    notificarIrmaos: false,
  })) as Announcement[];
  await act(() => root!.render(createElement(AvisosCard, { announcements })));
  expect(host.querySelectorAll('li')).toHaveLength(4);
  expect(host.querySelector('a[href="/avisos"]')).toBeNull();
  await click(host, 'Ver todos');
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(dialog.querySelectorAll('li')).toHaveLength(4);
  await click(dialog, 'Comunicado 1');
  expect(dialog.querySelector('article')?.textContent).toContain('Texto completo 1');
  await click(dialog, 'Próximo');
  expect(dialog.querySelector('article')?.textContent).toContain('Texto completo 2');
  await click(dialog, 'Anterior');
  expect(dialog.querySelector('article')?.textContent).toContain('Texto completo 1');
  await click(dialog, 'Voltar à lista');
  expect(dialog.querySelectorAll('li')).toHaveLength(4);
});
