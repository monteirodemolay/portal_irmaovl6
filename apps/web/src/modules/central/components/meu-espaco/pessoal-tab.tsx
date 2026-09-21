import type { Member, MemberCentralProfile, SharedFamilyPersonMatch } from '@vl6/domain';
import { MapPin } from '@vl6/ui';
import { AddressMaritalCard } from '@/modules/membership/components/profile-fields/address-marital-card';
import { updateMyProfileAction } from '@/modules/membership/actions/self-profile-actions';
import { FamilyLegacyCard } from '@/modules/family-legacy/components/family-legacy-card';
import type { OwnerFamilyNetworkDTO } from '@/modules/family-legacy/lib/load-owner-family-network-dto';

export function PessoalTab({
  member,
  familyNetwork,
  sharedFamilyPersons,
}: {
  member: Member;
  profile: MemberCentralProfile | null;
  familyNetwork: OwnerFamilyNetworkDTO;
  sharedFamilyPersons: SharedFamilyPersonMatch[];
}) {
  return (
    <div className="flex flex-col gap-4">
      {/*
        `key={member.updatedAt.getTime()}` — sem ela, salvar aqui e o
        `revalidatePath` trazer o `member` atualizado não bastava: o
        `AddressMaritalCard` guarda seu próprio rascunho em `useState`/
        `defaultValue` a partir de `member`, lido só na montagem, então
        React mantinha o mesmo componente na mesma posição sem reinicializar
        o estado — só um F5 mostrava o valor certo (bug relatado pelo
        Administrador). Trocar a `key` a cada `updatedAt` força o remount.
      */}
      <AddressMaritalCard
        key={member.updatedAt.getTime()}
        member={member}
        action={updateMyProfileAction}
      />

      <p className="text-muted flex items-center gap-1.5 text-xs">
        <MapPin size={12} /> Estado civil nunca aparece na Central. O endereço pode aparecer no seu
        perfil se você permitir na aba &ldquo;Privacidade&rdquo; — por padrão, fica visível só para
        a administração da Loja.
      </p>

      <FamilyLegacyCard network={familyNetwork} sharedFamilyPersons={sharedFamilyPersons} />

      <p className="text-muted flex items-center gap-1.5 text-xs">
        <MapPin size={12} /> Os vínculos familiares ficam privados por padrão. Somente informações
        autorizadas aparecem no perfil ou no Acervo.
      </p>
    </div>
  );
}
