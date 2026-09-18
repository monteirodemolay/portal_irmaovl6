'use client';
import { Button } from '@vl6/ui';
export function PrintLibraryLabelsButton() {
  return (
    <Button type="button" onClick={() => window.print()}>
      Imprimir etiquetas
    </Button>
  );
}
