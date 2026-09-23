import { redirect } from 'next/navigation';

/**
 * Link antigo — a rota "Configurações" foi movida para `/configuracoes`
 * (fora de `/irmaos`) pra não compartilhar o prefixo `/irmaos/*` com o
 * Diretório e evitar que o item "Irmãos" da sidebar ative/expanda junto.
 * `/irmaos/configuracoes/termos-e-privacidade` (rota-filha) continua onde
 * está — não é afetada por este redirect, que só cobre o segmento exato.
 */
export default function ConfiguracoesRedirectPage() {
  redirect('/configuracoes');
}
