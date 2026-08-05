import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

describe('Avatar', () => {
  it('renderiza o fallback com as iniciais quando a imagem não carrega', () => {
    render(
      <Avatar>
        <AvatarImage src="/foto-inexistente.jpg" alt="Fulano de Tal" />
        <AvatarFallback>FT</AvatarFallback>
      </Avatar>,
    );

    // jsdom nunca dispara o evento de carregamento da imagem do Radix Avatar,
    // então o fallback é o único conteúdo visível — comportamento real do
    // componente quando a foto do Irmão ainda não carregou/falhou.
    expect(screen.getByText('FT')).toBeInTheDocument();
  });
});
