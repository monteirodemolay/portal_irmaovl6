import type { ReactNode } from 'react';
import type { Honor, MemberTitle, PhilosophicalJourney, PublicMemberProfileDTO } from '@vl6/domain';
import type { PersonPhoto } from '@/modules/archive/components/person-photo-grid';
import { ProfileHeaderCard } from './profile-header-card';
import { ProfileOverviewTab } from './profile-overview-tab';
import { ProfileTrajectoryTab } from './profile-trajectory-tab';
import { ProfileFamilyTab } from './profile-family-tab';
import { ProfileAcervoTab } from './profile-acervo-tab';
import { InMemoriamProfileView } from './in-memoriam-profile-view';

function SectionHeading({ title, id }: { title: string; id?: string }) {
  return (
    <h2
      id={id}
      className="border-border text-muted scroll-mt-6 border-t pt-6 text-xs font-bold uppercase tracking-[0.14em]"
    >
      {title}
    </h2>
  );
}

/**
 * Perfil único do Irmão (Fase 2 — unificação Acervo/Diretório, ver relatório
 * "Saneamento do Acervo VL6" publicado nesta sessão) — cabeçalho
 * institucional seguido de todas as seções empilhadas numa página só
 * (Visão Geral / Trajetória e Honrarias / Família e Legado / Acervo).
 * Chegou a ter 4 abas clicáveis (`ProfileTabs`), mas o Administrador achou
 * o formato desengajador pra revisar o cadastro de um Irmão — "se a gente
 * cria muita aba, perde-se o interesse em verificar as coisas" — por isso
 * virou rolagem única, sem componente client-side de troca de aba. Antes
 * desta fase, `/acervo/pessoas/[memberId]` e o drawer lateral do Diretório
 * duplicavam esse conteúdo em telas separadas — agora tudo mora aqui, e as
 * duas rotas passam a apontar (ou redirecionar) pra esta mesma página.
 * Nunca renderiza uma seção vazia: se uma delas não tem nada pra mostrar,
 * ela mesma decide o que exibir no lugar (ver cada `Profile*Tab`).
 */
export function PublicMemberProfileView({
  profile,
  canViewAcervo = false,
  isOwnProfile = false,
  memberTitles = [],
  honors = [],
  philosophicalJourneys = [],
  acervoPhotos = [],
  acervoRelationsSlot = null,
  layout = 'full',
}: {
  profile: PublicMemberProfileDTO;
  /** Gate da seção "Acervo" — ponte Diretório → Acervo (Fase B/C). */
  canViewAcervo?: boolean;
  /** Sessão atual == dono deste perfil → mostra "Editar meu perfil" e "Editar" por bloco. */
  isOwnProfile?: boolean;
  /** Títulos e Condições Maçônicas cadastrados (Fase 1 de Honrarias) — exibidos em Trajetória. */
  memberTitles?: MemberTitle[];
  /** Honrarias e Condecorações cadastradas (Fase 3 de Honrarias) — exibidas em Trajetória. */
  honors?: Honor[];
  /** Graus Filosóficos/Corpos Maçônicos (Fase 3) — só os `visivel` chegam a Trajetória. */
  philosophicalJourneys?: PhilosophicalJourney[];
  /** Fotos institucionais do Acervo VL6 em que este Irmão está marcado — ver `ProfileAcervoTab`. */
  acervoPhotos?: PersonPhoto[];
  /** `RelationsSection` (Server Component, precisa de `container`/`authContext`) já renderizado pela página. */
  acervoRelationsSlot?: ReactNode;
  /**
   * `'full'` (padrão) — página cheia (`/irmaos/[memberId]`). `'compact'` —
   * "Ver como os outros veem" (Dialog, sempre mais estreito que a página
   * cheia) — força grid de 1 coluna na Visão Geral, sem depender de nenhum
   * breakpoint de viewport.
   */
  layout?: 'full' | 'compact';
}) {
  // Perfil In Memoriam (situação terminal `falecido`) usa uma grade "bento"
  // própria (crítica direta do Administrador sobre a versão anterior: "a
  // tela ficou disforme... insira em contextos") em vez das seções
  // empilhadas em largura cheia usadas pelo Irmão ativo — ver
  // `InMemoriamProfileView` pro racional completo.
  if (profile.situacao === 'falecido') {
    return (
      <InMemoriamProfileView
        profile={profile}
        canViewAcervo={canViewAcervo}
        memberTitles={memberTitles}
        honors={honors}
        philosophicalJourneys={philosophicalJourneys}
        acervoPhotos={acervoPhotos}
        acervoRelationsSlot={acervoRelationsSlot}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfileHeaderCard profile={profile} isOwnProfile={isOwnProfile} />

      <ProfileOverviewTab profile={profile} isOwnProfile={isOwnProfile} layout={layout} />

      <SectionHeading title="Trajetória e Honrarias" id="trajetoria" />
      <ProfileTrajectoryTab
        profile={profile}
        memberTitles={memberTitles}
        honors={honors}
        philosophicalJourneys={philosophicalJourneys}
      />

      <SectionHeading title="Família e Legado" />
      <ProfileFamilyTab profile={profile} canViewAcervo={canViewAcervo} />

      {canViewAcervo && (
        <>
          <SectionHeading title="Acervo" id="acervo" />
          <ProfileAcervoTab
            profile={profile}
            canViewAcervo={canViewAcervo}
            acervoPhotos={acervoPhotos}
            relationsSlot={acervoRelationsSlot}
          />
        </>
      )}
    </div>
  );
}
