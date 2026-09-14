import type { ReactNode } from 'react';
import type { PublicMemberProfileDTO } from '@vl6/domain';
import { Camera, EmptyState, Lock } from '@vl6/ui';
import { PersonPhotoGrid, type PersonPhoto } from '@/modules/archive/components/person-photo-grid';
import { MemberPhotoGrid } from './member-photo-grid';
import { Panel } from './profile-shared';

/**
 * Aba "Acervo" do Perfil único (Fase 2) — herda o que antes vivia em
 * `/acervo/pessoas/[memberId]` (fotografias institucionais marcadas +
 * Constelação da Memória, sempre visível a quem tem `member:read`, nunca
 * gated pelo consentimento voluntário do Irmão) junto da "Memória
 * Fotográfica" que o próprio Irmão escolheu publicar no Diretório
 * (`profile.memoriaFotografica`, bloco opcional). São dois conjuntos de
 * fotos com regras de visibilidade diferentes — nunca mesclados num só
 * grid, pra não confundir "o Irmão publicou" com "está marcado em fotos do
 * Acervo".
 */
export function ProfileAcervoTab({
  profile,
  canViewAcervo,
  acervoPhotos,
  relationsSlot,
}: {
  profile: PublicMemberProfileDTO;
  canViewAcervo: boolean;
  acervoPhotos: PersonPhoto[];
  relationsSlot: ReactNode;
}) {
  const hasMemoriaFotografica = Boolean(
    profile.memoriaFotografica && profile.memoriaFotografica.length > 0,
  );

  if (!canViewAcervo) {
    return (
      <EmptyState
        icon={<Lock size={22} />}
        title="Acervo indisponível"
        description="Sua função não tem acesso ao Acervo VL6."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {hasMemoriaFotografica && profile.memoriaFotografica && (
        <Panel kicker="MEMÓRIA" title="Memória Fotográfica" icon={Camera}>
          <MemberPhotoGrid photos={profile.memoriaFotografica} />
        </Panel>
      )}

      {acervoPhotos.length > 0 && (
        <Panel kicker="ACERVO VL6" title="Fotografias" icon={Camera}>
          <PersonPhotoGrid photos={acervoPhotos} />
        </Panel>
      )}

      {!hasMemoriaFotografica && acervoPhotos.length === 0 && (
        <EmptyState
          icon={<Camera size={22} />}
          title="Nenhuma fotografia ainda"
          description="Fotografias publicadas no Acervo VL6 em que este Irmão está identificado aparecerão aqui."
        />
      )}

      {relationsSlot}
    </div>
  );
}
