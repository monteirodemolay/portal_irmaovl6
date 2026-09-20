import { Button } from '@vl6/ui';
import { ensureBibliotecarioRoleAction } from '../actions/bibliotecario-role-actions';

export function EnsureBibliotecarioRoleButton() {
  return (
    <form action={ensureBibliotecarioRoleAction}>
      <Button type="submit" variant="outline">
        Criar ou atualizar papel Bibliotecário
      </Button>
    </form>
  );
}
