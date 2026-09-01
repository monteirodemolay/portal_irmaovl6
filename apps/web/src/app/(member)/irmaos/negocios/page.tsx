import { redirect } from 'next/navigation';

type SearchParams = Record<string, string | undefined>;

/**
 * `/irmaos/negocios` — compatibilidade de rota antiga (documento de
 * referência, tabela de redirecionamentos): a busca de Negócios & Serviços
 * agora vive dentro da Comunidade VL6 unificada, com `tipo=negocios`
 * pré-selecionado. Preserva os parâmetros de busca antigos (`q`, `segmento`,
 * `cidade`, `online`) — só `online` muda de forma (`'1'`/ausente em ambas).
 */
export default async function NegociosRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const target = new URLSearchParams();
  target.set('tipo', 'negocios');
  if (params.q) target.set('q', params.q);
  if (params.segmento) target.set('segmento', params.segmento);
  if (params.cidade) target.set('cidade', params.cidade);
  if (params.online === '1') target.set('online', '1');
  redirect(`/irmaos?${target.toString()}`);
}
