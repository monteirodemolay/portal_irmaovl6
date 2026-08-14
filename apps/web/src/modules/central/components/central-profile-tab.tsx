import type {
  MemberCentralProfile,
  PublicationSettings,
  PublicMemberProfileDTO,
} from '@vl6/domain';
import { Eye, ShieldCheck } from '@vl6/ui';
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
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="border-primary/20 bg-primary/5 flex gap-3 rounded-2xl border p-5">
        <ShieldCheck size={20} strokeWidth={1.75} className="text-primary mt-0.5 shrink-0" />
        <p className="text-sm">
          A Central dos Irmãos VL6 é um diretório institucional privado e voluntário. Sua
          participação é opcional — nenhuma informação complementar é publicada sem sua confirmação,
          e o restante do Portal continua funcionando normalmente mesmo que você não preencha nada
          aqui.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Editar meu conteúdo</h2>
        <CentralContentForm profile={profile} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg font-semibold">Privacidade e publicação</h2>
        <CentralVisibilityForm settings={settings} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold">
          <Eye size={18} className="text-muted" />
          Assim seu perfil aparece para os demais Irmãos
        </h2>
        <PublicMemberProfileView profile={previewDto} />
      </section>
    </div>
  );
}
