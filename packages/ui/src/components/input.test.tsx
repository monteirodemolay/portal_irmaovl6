import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('aceita digitação e dispara onChange', async () => {
    const onChange = vi.fn();
    render(<Input aria-label="Nome" onChange={onChange} />);

    const input = screen.getByLabelText('Nome');
    await userEvent.type(input, 'Fulano');

    expect(input).toHaveValue('Fulano');
    expect(onChange).toHaveBeenCalled();
  });

  it('respeita o type informado', () => {
    render(<Input aria-label="E-mail" type="email" />);
    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email');
  });

  it('fica desabilitado e não aceita digitação quando disabled', async () => {
    render(<Input aria-label="Matrícula" disabled defaultValue="" />);

    const input = screen.getByLabelText('Matrícula');
    expect(input).toBeDisabled();
    await userEvent.type(input, '123');
    expect(input).toHaveValue('');
  });

  it('encaminha a ref para o elemento <input>', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="CIM" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
