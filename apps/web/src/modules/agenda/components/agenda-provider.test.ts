// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Event } from '@vl6/domain';
vi.mock('./agenda-drawer', () => ({ AgendaDrawer: () => null }));
import { AgendaProvider, useAgenda } from './agenda-provider';

let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(() => root!.unmount());
  host?.remove();
  root = undefined;
});

function Probe() {
  const ctx = useAgenda();
  return createElement(
    'div',
    {},
    createElement(
      'button',
      { onClick: () => ctx.openAgenda(undefined, { scope: 'sessions' }) },
      'Todas as sessões',
    ),
    createElement(
      'button',
      { onClick: () => ctx.openAgenda(undefined, { scope: 'events' }) },
      'Todos os eventos',
    ),
    createElement('button', { onClick: () => ctx.openAgenda('s2') }, 'Ficha'),
    createElement(
      'button',
      { onClick: () => ctx.openAgenda(undefined, { scope: ctx.scope }) },
      'Voltar à lista',
    ),
    createElement(
      'output',
      { 'data-selection': ctx.selectedEventId ?? 'list', 'data-scope': ctx.scope },
      ctx.filteredEvents.map((e) => e.id).join(','),
    ),
  );
}
async function click(text: string) {
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === text)!;
  await act(() => button.click());
}

it('Ver todos abre a coleção e apaga a seleção anterior, preservando o tipo em cada ficha', async () => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  const events = [
    { id: 's2', tipo: 'sessao', dataInicio: new Date('2026-11-09T23:00:00Z') },
    { id: 'e1', tipo: 'evento', dataInicio: new Date('2026-10-31T23:00:00Z') },
    { id: 's1', tipo: 'sessao', dataInicio: new Date('2026-10-26T23:00:00Z') },
  ] as Event[];
  await act(() =>
    root!.render(
      createElement(AgendaProvider, {
        events,
        canManageEvents: false,
        children: createElement(Probe),
      }),
    ),
  );
  await click('Todas as sessões');
  expect(host.querySelector('output')?.dataset.selection).toBe('list');
  expect(host.querySelector('output')?.textContent).toBe('s1,s2');
  await click('Ficha');
  expect(host.querySelector('output')?.dataset.selection).toBe('s2');
  expect(host.querySelector('output')?.dataset.scope).toBe('sessions');
  await click('Voltar à lista');
  expect(host.querySelector('output')?.dataset.selection).toBe('list');
  await click('Todos os eventos');
  expect(host.querySelector('output')?.dataset.selection).toBe('list');
  expect(host.querySelector('output')?.textContent).toBe('e1');
  await click('Todas as sessões');
  expect(host.querySelector('output')?.dataset.selection).toBe('list');
});
