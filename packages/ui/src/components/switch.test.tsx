import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch } from './switch';

describe('Switch', () => {
  it('reflete o estado marcado/desmarcado como um checkbox nativo', async () => {
    const user = userEvent.setup();
    render(<Switch name="blocks.apresentacao" aria-label="Apresentação" />);

    const input = screen.getByRole('checkbox', { name: 'Apresentação' });
    expect(input).not.toBeChecked();

    await user.click(input);
    expect(input).toBeChecked();
  });

  it('respeita defaultChecked', () => {
    render(<Switch name="ativo" aria-label="Ativo" defaultChecked />);
    expect(screen.getByRole('checkbox', { name: 'Ativo' })).toBeChecked();
  });
});
