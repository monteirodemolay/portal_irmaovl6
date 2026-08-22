'use client';

import { useState } from 'react';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { Drawer, DrawerBody, DrawerContent, DrawerTitle } from '@vl6/ui';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';
import { MemberDirectoryCard } from './member-directory-card';

/**
 * Grade do Diretório + painel lateral de perfil — tudo client-side, sem
 * navegação de rota. `items` já vem com o `PublicMemberProfileDTO`
 * completo de cada Irmão (a mesma busca do Diretório já monta o DTO
 * inteiro pra calcular métricas/facetas), então abrir o painel é só achar
 * o item por `memberId` no array já carregado — sem round-trip extra ao
 * servidor. Evita de propósito rota interceptada/paralela (`@slot`), que
 * mostrou instabilidade em produção com Next.js 15 nesse app.
 */
export function DirectoryResultsGrid({ items }: { items: PublicMemberProfileDTO[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((item) => item.memberId === selectedId) ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((profile) => (
          <MemberDirectoryCard
            key={profile.memberId}
            profile={profile}
            onClick={() => setSelectedId(profile.memberId)}
          />
        ))}
      </div>

      <Drawer open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DrawerContent>
          {/* O nome do Irmão já aparece visível dentro do painel — este
              título só existe pra leitores de tela (Radix exige um
              `Dialog.Title` associado via aria-labelledby). */}
          <DrawerTitle className="sr-only">Perfil do Irmão</DrawerTitle>
          <DrawerBody>{selected && <PublicMemberProfileView profile={selected} />}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
}
