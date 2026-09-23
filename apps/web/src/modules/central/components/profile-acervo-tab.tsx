import type { ReactNode } from 'react';
import { Camera, EmptyState, Lock } from '@vl6/ui';
import { PersonPhotoGrid, type PersonPhoto } from '@/modules/archive/components/person-photo-grid';
import { Panel } from './profile-shared';

/**
 * Aba "Acervo" do Perfil único (Fase 2) — herda o que antes vivia em
 * `/acervo/pessoas/[memberId]` (fotografias institucionais marcadas +
 * Constelação da Memória, sempre visível a quem tem `member:read`, nunca
 * gated pelo consentimento voluntário do Irmão).
 *
 * Não existe mais um painel separado de "Memória Fotográfica" aqui: esse
 * bloco (`profile.memoriaFotografica`, a seleção que o próprio Irmão opta
 * por publicar no Diretório) é, na prática, sempre um subconjunto das fotos
 * do Acervo abaixo — qualquer sessão que chega até esta aba já tem
 * `member:read`/`canViewAcervo`, então mostrar os dois juntos só duplicava
 * as mesmas fotos duas vezes na tela (reportado pelo Administrador). O
 * campo `memoriaFotografica` continua existindo no perfil (e o Irmão
 * continua controlando o consentimento em Meu Espaço → Privacidade) — só
 * não tem mais um grid próprio aqui, redundante com "Fotografias".
 */
export function ProfileAcervoTab({
  canViewAcervo,
  acervoPhotos,
  relationsSlot,
}: {
  canViewAcervo: boolean;
  acervoPhotos: PersonPhoto[];
  relationsSlot: ReactNode;
}) {
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
      {acervoPhotos.length > 0 ? (
        <Panel kicker="ACERVO VL6" title="Fotografias" icon={Camera}>
          <PersonPhotoGrid photos={acervoPhotos} />
        </Panel>
      ) : (
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
