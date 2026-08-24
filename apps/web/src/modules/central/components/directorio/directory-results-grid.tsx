'use client';

import type { PublicMemberProfileDTO } from '@vl6/domain';
import { MemberDirectoryCard } from './member-directory-card';
import { useMemberProfile } from './member-profile-provider';

/**
 * Grade do Diretório — o painel lateral de perfil é o global
 * (`MemberProfileProvider`, montado em `(member)/layout.tsx`), usado por
 * qualquer ponto do Portal que abra um perfil de Irmão. Como esta grade já
 * tem o `PublicMemberProfileDTO` completo de cada item em mãos (a mesma
 * busca do Diretório já monta o DTO inteiro pra calcular métricas/facetas),
 * ele é passado direto ao abrir — sem round-trip extra ao servidor.
 */
export function DirectoryResultsGrid({ items }: { items: PublicMemberProfileDTO[] }) {
  const { openMemberProfile } = useMemberProfile();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((profile) => (
        <MemberDirectoryCard
          key={profile.memberId}
          profile={profile}
          onClick={() => openMemberProfile(profile.memberId, profile)}
        />
      ))}
    </div>
  );
}
