// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Event } from '@vl6/domain';
vi.mock('./agenda-calendar', () => ({ AgendaCalendar: () => null }));
vi.mock('./agenda-event-details', () => ({
  AgendaEventDetails: ({ event }: { event: Event }) => createElement('article', {}, event.titulo),
}));
import { AgendaProvider, useAgenda } from './agenda-provider';
let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  host?.remove();
  root = undefined;
});
function Trigger() {
  const ctx = useAgenda();
  return createElement(
    'button',
    { onClick: () => ctx.openAgenda(undefined, { scope: 'sessions' }) },
    'Ver todas',
  );
}
async function click(container: Element, text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(text),
  );
  expect(button).toBeDefined();
  await act(() => button!.click());
}
it('abre toda a sequência, navega pelas fichas e volta à lista mantendo a página montada', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const events = Array.from({ length: 8 }, (_, i) => ({
    id: `s${i}`,
    tipo: 'sessao',
    titulo: `Sessão número ${i + 1}`,
    local: 'Templo',
    dataInicio: new Date(2026, 10, i + 1, 20),
    dataFim: null,
  })) as Event[];
  await act(() =>
    root!.render(
      createElement(AgendaProvider, {
        events: events.reverse(),
        canManageEvents: false,
        children: createElement(Trigger),
      }),
    ),
  );
  await click(host, 'Ver todas');
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.querySelectorAll('li')).toHaveLength(8);
  expect(dialog.querySelector('article')).toBeNull();
  await click(dialog, 'Sessão número 1');
  expect(dialog.querySelector('article')?.textContent).toBe('Sessão número 1');
  await click(dialog, 'Próximo');
  expect(dialog.querySelector('article')?.textContent).toBe('Sessão número 2');
  await click(dialog, 'Anterior');
  expect(dialog.querySelector('article')?.textContent).toBe('Sessão número 1');
  await click(dialog, 'Voltar à lista');
  expect(dialog.querySelectorAll('li')).toHaveLength(8);
  await click(dialog, 'Voltar à página');
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(host.textContent).toBe('Ver todas');
});
