import { redirect } from 'next/navigation';

/**
 * A migração deixou de ser uma ferramenta isolada. O endereço antigo é
 * preservado para favoritos e links administrativos, mas abre a seção de
 * saneamento da Central do Acervo.
 */
export default function MigracaoPage() {
  redirect('/admin/acervo#migracao');
}
