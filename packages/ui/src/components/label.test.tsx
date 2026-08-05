import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from './input';
import { Label } from './label';

describe('Label', () => {
  it('associa-se ao campo via htmlFor', () => {
    render(
      <>
        <Label htmlFor="nome">Nome completo</Label>
        <Input id="nome" />
      </>,
    );

    expect(screen.getByLabelText('Nome completo')).toBeInstanceOf(HTMLInputElement);
  });
});
