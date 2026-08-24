'use client';

import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerTitle,
  EmptyState,
  RefreshCw,
  Users,
} from '@vl6/ui';
import { PublicMemberProfileView } from '@/modules/central/components/public-member-profile-view';
import { useMemberProfile } from './member-profile-provider';

export function MemberProfileDrawer() {
  const { isOpen, isLoading, profile, notFound, closeMemberProfile } = useMemberProfile();

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && closeMemberProfile()}>
      <DrawerContent>
        {/* O nome do Irmão já aparece visível dentro do painel — este
            título só existe pra leitores de tela (Radix exige um
            `Dialog.Title` associado via aria-labelledby). */}
        <DrawerTitle className="sr-only">Perfil do Irmão</DrawerTitle>
        <DrawerBody>
          {isLoading ? (
            <div className="text-muted flex items-center justify-center gap-2 p-12 text-sm">
              <RefreshCw size={16} className="animate-spin" />
              Carregando…
            </div>
          ) : profile ? (
            <PublicMemberProfileView profile={profile} />
          ) : notFound ? (
            <EmptyState
              icon={<Users size={22} strokeWidth={1.75} />}
              title="Perfil indisponível"
              description="Este Irmão optou por não disponibilizar um perfil no Diretório, ou você não tem permissão pra vê-lo."
            />
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
