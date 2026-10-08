// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveSearchForm } from './live-search-form';
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace }) }));
vi.mock('@/components/layout/context-link', () => ({
  default: (props: Record<string, unknown>) => createElement('a', props),
}));
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
function type(value: string) {
  const input = host.querySelector('input')!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  replace.mockReset();
  window.history.replaceState({}, '', '/noticias?q=antes&ano=2026&pagina=4');
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
});
function render(autoNavigate = true) {
  act(() =>
    root.render(
      createElement(
        LiveSearchForm,
        {
          action: '/noticias',
          autoNavigate,
          suggestions: [{ label: 'Sessão Pública', href: '/noticias/sessao' }],
        },
        createElement('input', { name: 'q', defaultValue: 'antes' }),
        createElement('input', { name: 'ano', type: 'hidden', value: '2026', readOnly: true }),
      ),
    ),
  );
}
describe('Live portal search', () => {
  it('shows preloaded matches before the server navigation, preserving filters and resetting pagination', () => {
    render();
    type('sessao');
    expect(host.querySelector('[data-search-suggestion]')?.textContent).toBe('Sessão Pública');
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(350));
    expect(replace).toHaveBeenCalledOnce();
    const url = new URL(replace.mock.calls[0]![0], window.location.origin);
    expect(url.searchParams.get('q')).toBe('sessao');
    expect(url.searchParams.get('ano')).toBe('2026');
    expect(url.searchParams.has('pagina')).toBe(false);
  });
  it('debounces rapid typing and cancels pending navigation on unmount', () => {
    render();
    type('s');
    type('se');
    type('ses');
    act(() => vi.advanceTimersByTime(349));
    expect(replace).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledOnce();
    type('outra');
    act(() => root.unmount());
    act(() => vi.advanceTimersByTime(350));
    expect(replace).toHaveBeenCalledOnce();
  });
  it('cancels pending search when selecting a suggestion', () => {
    render();
    type('sessao');
    host.addEventListener('click', (event) => event.preventDefault(), { once: true });
    act(() =>
      host
        .querySelector('[data-search-suggestion]')!
        .dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })),
    );
    act(() => vi.advanceTimersByTime(350));
    expect(replace).not.toHaveBeenCalled();
  });
  it('does not change the Acervo landing page while typing; submit opens the search', () => {
    render(false);
    type('sessao');
    act(() => vi.advanceTimersByTime(500));
    expect(replace).not.toHaveBeenCalled();
    act(() =>
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
    expect(replace).toHaveBeenCalledOnce();
  });
});
