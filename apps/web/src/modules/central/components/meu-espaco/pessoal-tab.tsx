import type { Member, MemberCentralProfile } from '@vl6/domain';
import { MapPin } from '@vl6/ui';
import { AddressMaritalCard } from '@/modules/membership/components/profile-fields/address-marital-card';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';

export function PessoalTab({ member }: { member: Member; profile: MemberCentralProfile | null }) {
  return (
    <div className="flex flex-col gap-4">
      <AddressMaritalCard member={member} action={updateMyProfileAction} />

      <p className="text-muted flex items-center gap-1.5 text-xs">
        <MapPin size={12} /> Estado civil nunca aparece na Central. O endereço pode aparecer no seu
        perfil se você permitir na aba &ldquo;Privacidade&rdquo; — por padrão, fica visível só para
        a administração da Loja.
      </p>
    </div>
  );
}
