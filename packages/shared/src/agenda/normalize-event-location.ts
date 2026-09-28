/** Denominação institucional do Templo Ivan Damasceno. */
export const VL6_TEMPLE_LOCATION = 'Templo da Verdadeira Luz - Ivan Damasceno';

/** Corrige apenas os dois nomes antigos; locais distintos não são modificados. */
export function normalizeEventLocation(location: string): string {
  const normalized = location.trim().toLocaleLowerCase('pt-BR').replace(/\s+/g, ' ');
  return normalized === 'templo da verdadeira luz' || normalized === 'a confirmar'
    ? VL6_TEMPLE_LOCATION
    : location;
}
