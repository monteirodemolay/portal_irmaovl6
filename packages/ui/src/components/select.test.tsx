import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Select } from './select';

describe('Select', () => {
  it('renderiza as opções e permite selecionar uma diferente', async () => {
    render(
      <Select aria-label="Grau" defaultValue="aprendiz">
        <option value="aprendiz">Aprendiz</option>
        <option value="companheiro">Companheiro</option>
        <option value="mestre">Mestre</option>
      </Select>,
    );

    const select = screen.getByLabelText('Grau');
    expect(select).toHaveValue('aprendiz');

    await userEvent.selectOptions(select, 'mestre');
    expect(select).toHaveValue('mestre');
  });

  it('fica desabilitado quando disabled', () => {
    render(
      <Select aria-label="Situação" disabled>
        <option value="regular">Regular</option>
      </Select>,
    );

    expect(screen.getByLabelText('Situação')).toBeDisabled();
  });
});
