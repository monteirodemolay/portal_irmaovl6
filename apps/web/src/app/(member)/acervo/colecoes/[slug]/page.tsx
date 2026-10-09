import { redirect } from 'next/navigation';

/** Compatibilidade para links antigos após a retirada de Coleções da experiência do Acervo. */
export default function ArchiveCollectionDetailPage() {
  redirect('/acervo/descobrir');
}
