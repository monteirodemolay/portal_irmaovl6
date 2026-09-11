import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LodgeTenureBadge } from './lodge-tenure-badge';

describe('LodgeTenureBadge', () => {
  it('conta até hoje quando não há dataFalecimento', () => {
    vi.setSystemTime(new Date('2026-01-01'));

    render(<LodgeTenureBadge dataIniciacao={new Date('2004-01-01')} />);

    expect(screen.getByText(/Há 22 anos na Loja/)).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('para de contar na data do falecimento — nunca soma tempo depois de partir', () => {
    vi.setSystemTime(new Date('2026-01-01'));

    render(
      <LodgeTenureBadge
        dataIniciacao={new Date('2004-01-01')}
        dataFalecimento={new Date('2010-01-01')}
      />,
    );

    expect(screen.getByText(/Há 6 anos na Loja/)).toBeInTheDocument();
    expect(screen.queryByText(/Há 22 anos na Loja/)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
