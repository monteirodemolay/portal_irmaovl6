import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renderiza o texto e responde a clique', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Salvar</Button>);

    const button = screen.getByRole('button', { name: 'Salvar' });
    await userEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('aplica a classe do variant e size informados', () => {
    render(
      <Button variant="destructive" size="lg">
        Excluir
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Excluir' });
    expect(button.className).toContain('bg-red-600');
    expect(button.className).toContain('h-12');
  });

  it('fica desabilitado e não dispara onClick quando disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Enviar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Enviar' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('encaminha a ref para o elemento <button>', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Confirmar</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
    expect(ref.current?.textContent).toBe('Confirmar');
  });

  it('com asChild, renderiza o elemento filho em vez de um <button>', () => {
    render(
      <Button asChild>
        <a href="/destino">Ir</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Ir' });
    expect(link).toHaveAttribute('href', '/destino');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
