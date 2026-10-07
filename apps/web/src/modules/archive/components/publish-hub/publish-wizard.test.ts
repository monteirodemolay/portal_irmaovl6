// @vitest-environment jsdom
import React, { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Event } from '@vl6/domain';

const observed = vi.hoisted(() => ({ refresh: vi.fn(), upload: vi.fn(), event: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: observed.refresh }) }));
vi.mock('./event-step', () => ({
  EventStep: (props: unknown) => {
    observed.event(props);
    return createElement('p', null, 'Escolher evento');
  },
}));
vi.mock('./upload-step', () => ({
  UploadStep: (props: {
    event: Event;
    initialArchiveItemId: string | null;
    onContinue: (id: string) => void;
  }) => {
    observed.upload(props);
    return createElement(
      'button',
      { onClick: () => props.onContinue(props.initialArchiveItemId ?? 'novo-item') },
      'Enviar arquivos',
    );
  },
}));
vi.mock('./classify-step', () => ({
  ClassifyStep: ({ onContinue }: { onContinue: () => void }) =>
    createElement('button', { onClick: onContinue }, 'Classificar'),
}));
vi.mock('./organize-step', () => ({
  OrganizeStep: ({ onContinue }: { onContinue: () => void }) =>
    createElement('button', { onClick: onContinue }, 'Organizar'),
}));
vi.mock('./review-summary-step', () => ({
  ReviewSummaryStep: ({ onContinue }: { onContinue: () => void }) =>
    createElement('button', { onClick: onContinue }, 'Revisar'),
}));
vi.mock('./publish-step', () => ({
  PublishStep: ({ onDone, doneLabel }: { onDone: () => void; doneLabel: string }) =>
    createElement('button', { onClick: onDone }, doneLabel),
}));
vi.mock('./use-archive-item-workspace', () => ({ useArchiveItemWorkspace: () => ({}) }));
import { PublishWizard } from './publish-wizard';

Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
let root: Root | undefined, host: HTMLDivElement;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  host?.remove();
  root = undefined;
  vi.clearAllMocks();
});
const event = { id: 'evento-existente', titulo: 'Acontecimento existente' } as Event;
async function render(initialArchiveItemId: string | null) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root!.render(
      createElement(PublishWizard, {
        initialEvent: event,
        initialArchiveItemId,
        events: [event],
        drafts: [],
        boardTerms: [],
        eventPublishState: {},
      }),
    ),
  );
}
async function click(text: string) {
  await act(async () =>
    [...host.querySelectorAll('button')].find((button) => button.textContent === text)!.click(),
  );
}
describe('Arquivos no espaço único do acontecimento', () => {
  it('retoma o lote correto sem exigir selecionar ou cadastrar outro evento', async () => {
    await render('item-existente');
    expect(observed.event).not.toHaveBeenCalled();
    expect(observed.upload).toHaveBeenLastCalledWith(
      expect.objectContaining({ event, initialArchiveItemId: 'item-existente', eventLocked: true }),
    );
    expect(host.textContent).not.toContain('Escolher evento');
  });
  it('preserva o evento e o lote ao passar por todas as etapas e concluir', async () => {
    await render(null);
    for (const text of [
      'Enviar arquivos',
      'Classificar',
      'Organizar',
      'Revisar',
      'Continuar editando este acontecimento',
    ])
      await click(text);
    expect(observed.refresh).toHaveBeenCalledOnce();
    expect(observed.upload).toHaveBeenLastCalledWith(
      expect.objectContaining({ event, initialArchiveItemId: 'novo-item', eventLocked: true }),
    );
    expect(observed.event).not.toHaveBeenCalled();
  });
  it('atualiza o painel de arquivos mantendo evento e lote, inclusive depois de falha de carregamento', async () => {
    await render('item-existente');
    const props = observed.upload.mock.calls[0]![0];
    await act(async () => props.onBack());
    expect(observed.refresh).toHaveBeenCalledOnce();
    expect(observed.upload).toHaveBeenCalledTimes(2);
    expect(observed.upload).toHaveBeenLastCalledWith(
      expect.objectContaining({ event, initialArchiveItemId: 'item-existente' }),
    );
  });
});
