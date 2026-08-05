import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  it('renderiza apenas o título quando description/action não são informados', () => {
    render(<EmptyState title="Nenhum registro encontrado" />);

    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument();
  });

  it('renderiza description e action quando informados', () => {
    render(
      <EmptyState
        title="Nenhuma notícia publicada"
        description="Publique a primeira notícia da Loja."
        action={<Button>Nova notícia</Button>}
      />,
    );

    expect(screen.getByText('Nenhuma notícia publicada')).toBeInTheDocument();
    expect(screen.getByText('Publique a primeira notícia da Loja.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nova notícia' })).toBeInTheDocument();
  });
});
