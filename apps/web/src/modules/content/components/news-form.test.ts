// @vitest-environment jsdom
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
const uploads = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock('@vercel/blob/client', () => ({ upload: uploads.upload }));
import { NewsForm } from './news-form';

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined, host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  vi.clearAllMocks();
});
const workspaceEvent = {
  id: 'e1',
  titulo: 'Sessão de instrução',
  dataInicio: '2026-10-07T20:00:00Z',
  tipo: 'sessao',
  local: 'Templo',
};
async function render() {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      createElement(NewsForm, {
        action: async () => ({ error: null }),
        workspaceEvent,
        photos: [{ id: 'm1', url: '/api/archive-media/m1', label: 'Foto da sessão' }],
      }),
    ),
  );
}
describe('Notícia integrada ao acontecimento', () => {
  it('pré-preenche o título e mantém o vínculo sem pedir outro cadastro ou seleção', async () => {
    await render();
    expect(host.querySelector<HTMLInputElement>('[name="titulo"]')!.value).toBe(
      workspaceEvent.titulo,
    );
    expect(host.querySelector<HTMLInputElement>('[name="eventId"]')!.value).toBe('e1');
    expect(host.querySelector('[name="eventId"]')!.tagName).toBe('INPUT');
    expect(host.querySelector('a[href="/admin/conteudo/agenda/novo"]')).toBeNull();
  });
  it('utiliza a foto existente na galeria sem upload nem duplicação do arquivo', async () => {
    await render();
    const button = [...host.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Usar na notícia'),
    )!;
    await act(async () => button.click());
    const html = host.querySelector<HTMLTextAreaElement>('[name="conteudoHtml"]')!.value;
    expect(html).toContain('data-news-gallery="true"');
    expect(html).toContain('/api/archive-media/m1');
    expect(button.disabled).toBe(true);
    expect(uploads.upload).not.toHaveBeenCalled();
  });
});
