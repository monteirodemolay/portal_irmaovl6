import { redirect } from 'next/navigation';

/**
 * Redirecionamento permanente pra unificação do Perfil do Irmão (Fase 2 —
 * ver relatório "Saneamento do Acervo VL6" publicado nesta sessão): a
 * "Pessoa do Acervo" deixou de ser página própria, virou a aba "Acervo" de
 * `/irmaos/[memberId]` — mesmo conteúdo (fotos institucionais marcadas,
 * Constelação da Memória), agora dentro do Perfil único, sem duplicar
 * cabeçalho/trajetória com o Diretório. Link antigo nunca quebra.
 */
export default async function ArchivePersonRedirectPage({
  params,
}: {
  params: Promise<{ memberId: string }>;
}) {
  const { memberId } = await params;
  redirect(`/irmaos/${memberId}?aba=acervo`);
}
