import type { PublicMemberProfileDTO } from '@vl6/domain';
import { MemberDirectoryCard } from './member-directory-card';

/**
 * Grade do Diretório — cada card navega direto pro Perfil único
 * (`/irmaos/[memberId]`), mesma página de sempre, nenhum painel lateral
 * separado (Fase 2 da unificação Acervo/Diretório matou o drawer global).
 */
export function DirectoryResultsGrid({ items }: { items: PublicMemberProfileDTO[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((profile) => (
        <MemberDirectoryCard key={profile.memberId} profile={profile} />
      ))}
    </div>
  );
}
