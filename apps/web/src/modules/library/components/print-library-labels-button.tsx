'use client';
import { Button } from '@vl6/ui';
export function PrintLibraryLabelsButton() {
  return (
    <Button type="button" className="w-full sm:w-auto" onClick={() => window.print()}>
      Imprimir etiquetas
    </Button>
  );
}
