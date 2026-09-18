import type { PublicMemberProfileDTO } from '@vl6/domain';
import { ProfileBioText } from '../profile-bio-text';
import { Panel } from '../profile-shared';

/**
 * "Apresentação" — biografia institucional do Irmão ativo, ou a mensagem de
 * homenagem (com a biografia como complemento, quando as duas existirem) no
 * In Memoriam. Some por completo quando não há nem uma coisa nem outra —
 * nunca imprime "sem apresentação" (regra do mock-up).
 */
export function PresentationCard({
  profile,
  isOwnProfile = false,
}: {
  profile: PublicMemberProfileDTO;
  isOwnProfile?: boolean;
}) {
  const isInMemoriam = profile.situacao === 'falecido';
  const canEdit = isOwnProfile && !isInMemoriam;
  const texto = profile.apresentacao?.texto ?? null;
  const homenagem = isInMemoriam ? profile.mensagemHomenagem : null;

  if (!texto && !homenagem) return null;

  return (
    <Panel
      id="apresentacao"
      kicker="PERFIL INSTITUCIONAL"
      title="Apresentação"
      editTab={canEdit ? 'geral' : undefined}
    >
      <div className="flex flex-col gap-4">
        {homenagem && (
          <p className="font-display whitespace-pre-line text-base italic leading-relaxed">
            {homenagem}
          </p>
        )}
        {texto && <ProfileBioText text={texto} />}
      </div>
    </Panel>
  );
}
