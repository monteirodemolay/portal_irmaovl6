import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card';

describe('Card', () => {
  it('compõe header, title, description, content e footer', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Loja Verdadeira Luz nº 06</CardTitle>
          <CardDescription>GLEG</CardDescription>
        </CardHeader>
        <CardContent>Conteúdo do card</CardContent>
        <CardFooter>Rodapé</CardFooter>
      </Card>,
    );

    expect(screen.getByRole('heading', { name: 'Loja Verdadeira Luz nº 06' })).toBeInTheDocument();
    expect(screen.getByText('GLEG')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument();
    expect(screen.getByText('Rodapé')).toBeInTheDocument();
  });
});
