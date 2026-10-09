import { redirect } from 'next/navigation';
import { requirePagePermission } from '@/lib/auth/require-permission';

/**
 * A criação isolada de notícia foi substituída pela Central de Publicação.
 * O acontecimento nasce primeiro e passa a ser a origem comum de notícia,
 * aviso, fotos, vídeos, documentos, linha do tempo e Constelação.
 */
export default async function NewNewsPage() {
  await requirePagePermission('news:create');
  redirect('/admin/publicacoes/novo');
}
