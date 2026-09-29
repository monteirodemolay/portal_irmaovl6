import type { Tenant } from '@vl6/domain';
import { resolveHeroPhoto } from '@vl6/domain';
import { PageHero } from '@vl6/ui';
import { PageHeroPhotoUpload } from '@/components/member/page-hero-photo-upload';

// Nenhum campo de domínio guarda o nome do Templo físico da Loja (procurado
// em todo o repositório — "Templo"/"Ivan Damasceno" só aparecem em nomes de
// teste e módulos sem relação). Até que a Loja cadastre isso em algum lugar
// do domínio, mantém-se como texto fixo, igual ao mock-up.
const TEMPLE_NAME = 'Templo Ivan Damasceno';

/**
 * Hero da Comunidade VL6 (`/irmaos`) — modelo original do `PageHero`
 * padronizado (docs de referência da tarefa), com foto de fundo real,
 * configurável pelo Administrador da Loja (`tenant:manage`), persistida em
 * `Tenant.heroPhotos['comunidade']` (com fallback pro campo legado
 * `comunidadeHeroFotoUrl` — ver `resolveHeroPhoto`).
 */
export function CommunityHero({
  tenant,
  canManagePhoto,
}: {
  tenant: Tenant;
  canManagePhoto: boolean;
}) {
  const photo = resolveHeroPhoto(tenant, 'comunidade');

  return (
    <PageHero
      kicker={tenant.nome}
      title="Irmãos"
      description="Pessoas, trajetórias e conhecimentos que fortalecem nossa comunidade. Encontre um Irmão ou conheça seus negócios e serviços."
      meta={TEMPLE_NAME}
      photoUrl={photo?.url}
      photoPosicao={photo?.posicao}
      actions={
        canManagePhoto && (
          <PageHeroPhotoUpload
            pageKey="comunidade"
            path="/irmaos"
            hasPhoto={Boolean(photo)}
            initialPosicao={photo?.posicao ?? 50}
            photoLabel="Selecionar foto do Templo"
          />
        )
      }
    />
  );
}
