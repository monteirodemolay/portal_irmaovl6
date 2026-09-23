import type { ReactNode } from 'react';
import { requireSession } from '@/lib/auth/require-session';

/**
 * Shell da Comunidade VL6 — antes hospedava as três abas "Diretório",
 * "Negócios & Serviços" e "Meu Espaço" (`TabNav`). A unificação (v1.2 do
 * roadmap) fundiu essas três experiências numa única página em
 * `/irmaos/page.tsx`, que já traz seu próprio cabeçalho "Comunidade VL6" —
 * por isso este layout só garante a sessão e deixa de duplicar título/nav.
 * `/irmaos/meu-espaco` continua existindo como rota dentro deste mesmo
 * layout (compatibilidade de link antigo). `/irmaos/configuracoes` virou
 * apenas um redirect pra `/configuracoes` — saiu do prefixo `/irmaos/*`
 * pra não ativar/expandir o item "Irmãos" na sidebar ao clicar em
 * "Configurações".
 */
export default async function IrmaosLayout({ children }: { children: ReactNode }) {
  await requireSession();

  return <div className="flex flex-col gap-6">{children}</div>;
}
