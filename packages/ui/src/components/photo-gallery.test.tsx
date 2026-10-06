import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoGallery } from './photo-gallery';
import type { MediaViewerItem } from './media-viewer-modal';

const photos: MediaViewerItem[] = [1, 2, 3].map((n) => ({
  kind: 'imagem',
  src: `/foto-${n}.jpg`,
  title: `Foto ${n}`,
}));

function currentCounter() {
  return screen.getByText(/^\d+ \/ 3$/).textContent;
}

describe('PhotoGallery', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('troca de foto sozinha e dá a volta no final', () => {
    render(<PhotoGallery photos={photos} />);
    expect(currentCounter()).toBe('1 / 3');

    act(() => void vi.advanceTimersByTime(4500));
    expect(currentCounter()).toBe('2 / 3');

    act(() => void vi.advanceTimersByTime(4500));
    expect(currentCounter()).toBe('3 / 3');

    act(() => void vi.advanceTimersByTime(4500));
    expect(currentCounter()).toBe('1 / 3');
  });

  it('pausa pelo botão e retoma ao tocar de novo', () => {
    render(<PhotoGallery photos={photos} />);
    fireEvent.click(screen.getByRole('button', { name: 'Pausar apresentação' }));

    act(() => void vi.advanceTimersByTime(20000));
    expect(currentCounter()).toBe('1 / 3');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar apresentação' }));
    act(() => void vi.advanceTimersByTime(4500));
    expect(currentCounter()).toBe('2 / 3');
  });

  it('não troca enquanto o mouse está sobre a foto', () => {
    render(<PhotoGallery photos={photos} />);
    const stage = screen.getByRole('group', { name: /Galeria de fotografias/ });

    fireEvent.mouseEnter(stage);
    act(() => void vi.advanceTimersByTime(20000));
    expect(currentCounter()).toBe('1 / 3');

    fireEvent.mouseLeave(stage);
    act(() => void vi.advanceTimersByTime(4500));
    expect(currentCounter()).toBe('2 / 3');
  });

  it('seleciona pela miniatura e navega pelas setas', () => {
    render(<PhotoGallery photos={photos} autoPlay={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver item 3: Foto 3' }));
    expect(currentCounter()).toBe('3 / 3');

    fireEvent.click(screen.getByRole('button', { name: 'Próxima fotografia' }));
    expect(currentCounter()).toBe('1 / 3');
  });

  it('abre o visualizador em tela cheia já na foto atual', () => {
    render(<PhotoGallery photos={photos} autoPlay={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ver item 2: Foto 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tela cheia' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Foto 2 — 2 de 3');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
