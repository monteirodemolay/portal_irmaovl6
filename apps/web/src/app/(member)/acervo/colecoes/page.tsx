import { redirect } from 'next/navigation';

/**
 * Coleções editoriais foram retiradas da experiência do Acervo. Mantemos a
 * rota apenas como compatibilidade para favoritos/links antigos, apontando
 * para a descoberta de conteúdo efetivamente publicado.
 */
export default function ArchiveCollectionsPage() {
  redirect('/acervo/descobrir');
}
