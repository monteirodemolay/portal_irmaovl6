// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { PublicationCenter, type EditorialItem } from './publication-center';

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined;
let host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
});
const day = 24 * 60 * 60 * 1000;
const event = (id: string, title: string, happenedAt: string): EditorialItem => ({
  id: `event:${id}`,
  title,
  type: 'Acontecimento',
  status: 'Realizado',
  href: `/admin/publicacoes/${id}`,
  eventId: id,
  happenedAt,
  publishedAt: null,
  scheduledAt: null,
  expiresAt: null,
  destination: 'Agenda',
});
const related = (eventId: string, type: string, status = 'Rascunho'): EditorialItem => ({
  ...event(eventId, `${type} de ${eventId}`, new Date().toISOString()),
  id: `${type}:${eventId}`,
  type,
  status,
  href: `/admin/conteudo/${type.toLowerCase()}/${eventId}`,
});
async function render(items: EditorialItem[], errors: string[] = []) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      createElement(PublicationCenter, {
        items,
        errors,
        createLinks: [{ href: '/admin/conteudo/agenda/novo', label: 'Sessão ou evento' }],
      }),
    ),
  );
}
async function open(label: string) {
  await act(async () => {
    [...host.querySelectorAll('button')].find((b) => b.textContent === label)!.click();
  });
}
async function pick(select: HTMLSelectElement, value: string) {
  await act(async () => {
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const selectWith = (value: string) =>
  [...host.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === value))!;
const past = (days: number) => new Date(Date.now() - days * day).toISOString();
const future = (days: number) => new Date(Date.now() + days * day).toISOString();

describe('Central editorial', () => {
  it('mantém falha parcial visível sem esconder os itens disponíveis', async () => {
    await render([event('e1', 'Sessão Magna', future(3))], ['Avisos']);
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Avisos');
    expect(host.querySelector('a[href="/admin/publicacoes/e1"]')?.textContent).toContain(
      'Sessão Magna',
    );
  });

  it('filtra por tipo mantendo só as fichas com itens daquele tipo', async () => {
    await render([
      event('e1', 'Com notícia', past(5)),
      related('e1', 'Notícia'),
      event('e2', 'Com arte', past(6)),
      related('e2', 'Arte'),
    ]);
    await open('Lista');
    expect(host.querySelectorAll('article')).toHaveLength(2);
    await pick(selectWith('Notícia'), 'Notícia');
    expect(host.querySelectorAll('article')).toHaveLength(1);
    expect(host.textContent).toContain('Com notícia');
    expect(host.textContent).not.toContain('Com arte');
  });

  it('separa acontecimento futuro de realizado aguardando complementos', async () => {
    await render([
      event('futuro', 'Sessão futura', future(10)),
      event('feito', 'Sessão realizada', past(10)),
    ]);
    const block = (heading: string) =>
      [...host.querySelectorAll('h2')].find((h) => h.textContent === heading)!.parentElement!
        .parentElement!.parentElement!.textContent ?? '';
    const proximos = block('Próximos acontecimentos');
    const complementar = block('Continuar construção da memória');
    expect(proximos).toContain('Sessão futura');
    expect(proximos).not.toContain('Sessão realizada');
    expect(complementar).toContain('Sessão realizada');
  });

  it('mostra ordem decrescente, filtra ano e restaura filtros', async () => {
    await render([
      event('old', 'Z antigo', '2024-02-01T12:00:00Z'),
      event('new', 'A recente', '2026-02-01T12:00:00Z'),
    ]);
    await open('Lista');
    expect([...host.querySelectorAll('article')].map((a) => a.textContent)).toEqual([
      expect.stringContaining('A recente'),
      expect.stringContaining('Z antigo'),
    ]);
    await pick(selectWith('2024'), '2024');
    expect(host.querySelectorAll('article')).toHaveLength(1);
    expect(host.querySelector('article')?.textContent).toContain('Z antigo');
    await open('Limpar filtros');
    expect(host.querySelectorAll('article')).toHaveLength(2);
    await pick(selectWith('oldest'), 'oldest');
    expect(host.querySelector('article')?.textContent).toContain('Z antigo');
  });

  it('apresenta ausência de dados nas duas visões', async () => {
    await render([]);
    expect(host.textContent).toContain(
      'Nenhum acontecimento realizado está aguardando complementos',
    );
    await open('Lista');
    expect(host.textContent).toContain('Nenhum acontecimento encontrado');
  });
});
