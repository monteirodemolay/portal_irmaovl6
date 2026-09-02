import type { Member, PublicMemberProfileDTO } from '@vl6/domain';
import { calculateProfileCompletion, type MemberCentralProfile } from '@vl6/domain';
import { Card, CardContent } from '@vl6/ui';
import { MemberDegreeBadge } from '@/components/membership/member-degree-badge';
import { CompletionRing } from './completion-ring';
import { PreviewAsOthersDialog } from './preview-as-others-dialog';
import { SelfPhotoUpload } from './self-photo-upload';

export function SpaceHeader({
  member,
  profile,
  profilePublished,
  previewDto,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  profilePublished: boolean;
  previewDto: PublicMemberProfileDTO;
}) {
  const completion = calculateProfileCompletion(member, profile);

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <SelfPhotoUpload
            fotoUrl={member.fotoUrl}
            nome={member.nomeCompleto}
            className="h-16 w-16"
          />
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-xl font-semibold">{member.nomeCompleto}</p>
            <MemberDegreeBadge grau={member.grau} />
            <p className="text-muted text-sm">
              {member.profissao && <span>{member.profissao} · </span>}
              Perfil no Diretório:{' '}
              <strong className={profilePublished ? 'text-emerald-700' : 'text-foreground'}>
                {profilePublished ? 'Publicado' : 'Não publicado'}
              </strong>
            </p>
          </div>
        </div>

        <div className="border-border-soft flex items-center gap-4 border-t pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <CompletionRing percent={completion} />
          <div className="max-w-[12rem]">
            <p className="text-sm font-semibold">
              Seu espaço está {completion}% completo<span className="text-muted">*</span>
            </p>
            <p className="text-muted text-xs">
              Preencha apenas o que desejar. * Estimativa de preenchimento do perfil pessoal — não é
              obrigatório completar.
            </p>
          </div>
        </div>

        <PreviewAsOthersDialog previewDto={previewDto} />
      </CardContent>
    </Card>
  );
}
