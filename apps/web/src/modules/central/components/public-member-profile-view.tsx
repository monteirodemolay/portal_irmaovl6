import type { ReactNode } from 'react';
import type { MemberTitle, PublicMemberProfileDTO } from '@vl6/domain';
import type { PersonPhoto } from '@/modules/archive/components/person-photo-grid';
import { ProfileHeaderCard } from './profile-header-card';
import { ProfileOverviewTab } from './profile-overview-tab';
import { ProfileTrajectoryTab } from './profile-trajectory-tab';
import { ProfileFamilyTab } from './profile-family-tab';
import { ProfileAcervoTab } from './profile-acervo-tab';
import { ProfileTabs } from './profile-tabs';

/**
 * Perfil único do Irmão (Fase 2 — unificação Acervo/Diretório, ver relatório
 * "Saneamento do Acervo VL6" publicado nesta sessão): cabeçalho institucional
 * sempre visível + 4 abas (Visão Geral / Trajetória e Honrarias / Família e
 * Legado / Acervo). Antes desta fase, `/acervo/pessoas/[memberId]` e o
 * drawer lateral do Diretório duplicavam esse conteúdo em telas
 * separadas — agora tudo mora aqui, e as duas rotas passam a apontar (ou
 * redirecionar) pra esta mesma página. Nunca renderiza uma seção vazia:
 * se uma aba não tem nada pra mostrar, ela mesma decide o que exibir no
 * lugar (ver cada `Profile*Tab`).
 */
export function PublicMemberProfileView({
  profile,
  canViewAcervo = false,
  isOwnProfile = false,
  memberTitles = [],
  acervoPhotos = [],
  acervoRelationsSlot = null,
  initialTab = 'geral',
  layout = 'full',
}: {
  profile: PublicMemberProfileDTO;
  /** Gate da aba "Acervo" — ponte Diretório → Acervo (Fase B/C). */
  canViewAcervo?: boolean;
  /** Sessão atual == dono deste perfil → mostra "Editar meu perfil" e "Editar" por bloco. */
  isOwnProfile?: boolean;
  /** Títulos e Condições Maçônicas cadastrados (Fase 1 de Honrarias) — exibidos na aba Trajetória. */
  memberTitles?: MemberTitle[];
  /** Fotos institucionais do Acervo VL6 em que este Irmão está marcado — ver `ProfileAcervoTab`. */
  acervoPhotos?: PersonPhoto[];
  /** `RelationsSection` (Server Component, precisa de `container`/`authContext`) já renderizado pela página. */
  acervoRelationsSlot?: ReactNode;
  /** Aba que abre primeiro — usado pelo redirect de `/acervo/pessoas/[id]` (`?aba=acervo`). */
  initialTab?: string;
  /**
   * `'full'` (padrão) — página cheia (`/irmaos/[memberId]`). `'compact'` —
   * "Ver como os outros veem" (Dialog, sempre mais estreito que a página
   * cheia) — força grid de 1 coluna dentro de cada aba, sem depender de
   * nenhum breakpoint de viewport.
   */
  layout?: 'full' | 'compact';
}) {
  return (
    <div className="flex flex-col gap-6">
      <ProfileHeaderCard profile={profile} isOwnProfile={isOwnProfile} />

      <ProfileTabs
        initialTab={initialTab}
        tabs={[
          { key: 'geral', label: 'Visão Geral' },
          { key: 'trajetoria', label: 'Trajetória e Honrarias' },
          { key: 'familia', label: 'Família e Legado' },
          ...(canViewAcervo ? [{ key: 'acervo', label: 'Acervo' }] : []),
        ]}
      >
        {{
          geral: (
            <ProfileOverviewTab profile={profile} isOwnProfile={isOwnProfile} layout={layout} />
          ),
          trajetoria: <ProfileTrajectoryTab profile={profile} memberTitles={memberTitles} />,
          familia: <ProfileFamilyTab profile={profile} canViewAcervo={canViewAcervo} />,
          ...(canViewAcervo
            ? {
                acervo: (
                  <ProfileAcervoTab
                    profile={profile}
                    canViewAcervo={canViewAcervo}
                    acervoPhotos={acervoPhotos}
                    relationsSlot={acervoRelationsSlot}
                  />
                ),
              }
            : {}),
        }}
      </ProfileTabs>
    </div>
  );
}
