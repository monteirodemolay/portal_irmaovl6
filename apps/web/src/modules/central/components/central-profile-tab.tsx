import type {
  MemberCentralProfile,
  PublicationSettings,
  PublicMemberProfileDTO,
} from '@vl6/domain';
import { CentralContentForm } from './central-content-form';
import { CentralVisibilityForm } from './central-visibility-form';
import { PublicMemberProfileView } from './public-member-profile-view';

export function CentralProfileTab({
  profile,
  settings,
  previewDto,
}: {
  profile: MemberCentralProfile | null;
  settings: PublicationSettings | null;
  previewDto: PublicMemberProfileDTO;
}) {
  return (
    <div className="flex flex-col gap-10">
      <p className="text-muted max-w-2xl text-sm">
        A Central dos Irmãos VL6 é um diretório institucional privado e voluntário. Sua participação
        é opcional — nenhuma informação complementar é publicada sem sua confirmação, e o restante
        do Portal continua funcionando normalmente mesmo que você não preencha nada aqui.
      </p>

      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">Editar meu conteúdo</h2>
        <CentralContentForm profile={profile} />
      </section>

      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">Privacidade e publicação</h2>
        <CentralVisibilityForm settings={settings} />
      </section>

      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">Como os outros Irmãos veem</h2>
        <div className="max-w-md">
          <PublicMemberProfileView profile={previewDto} />
        </div>
      </section>
    </div>
  );
}
