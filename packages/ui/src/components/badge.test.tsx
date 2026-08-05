import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
  it('renderiza o conteúdo com o variant default quando nenhum é informado', () => {
    render(<Badge>Ativo</Badge>);

    const badge = screen.getByText('Ativo');
    expect(badge.className).toContain('bg-primary/10');
  });

  it('aplica a classe do variant informado', () => {
    render(<Badge variant="destructive">Inativo</Badge>);

    const badge = screen.getByText('Inativo');
    expect(badge.className).toContain('bg-red-100');
  });

  it('mescla className extra sem perder as classes do variant', () => {
    render(
      <Badge variant="success" className="ml-2">
        Regular
      </Badge>,
    );

    const badge = screen.getByText('Regular');
    expect(badge.className).toContain('bg-emerald-100');
    expect(badge.className).toContain('ml-2');
  });
});
