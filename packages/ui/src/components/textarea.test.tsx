import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('aceita digitação de texto multilinha', async () => {
    render(<Textarea aria-label="Biografia" />);

    const textarea = screen.getByLabelText('Biografia');
    await userEvent.type(textarea, 'Linha 1{enter}Linha 2');

    expect(textarea).toHaveValue('Linha 1\nLinha 2');
  });

  it('fica desabilitado quando disabled', () => {
    render(<Textarea aria-label="Observações" disabled />);
    expect(screen.getByLabelText('Observações')).toBeDisabled();
  });

  it('encaminha a ref para o elemento <textarea>', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="Texto" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
