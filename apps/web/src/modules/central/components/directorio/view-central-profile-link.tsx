'use client';

import { useMemberProfileOptional } from './member-profile-provider';

/**
 * Link "Ver perfil completo na Central VL6" reaproveitado fora do Diretório
 * (ex.: Acervo VL6) — abre o painel lateral global em vez de navegar pra
 * `/irmaos/[memberId]`, pra manter a mesma experiência em todos os locais
 * do Portal. `useMemberProfileOptional` porque este botão pode, em tese,
 * renderizar fora do `(member)/layout.tsx` (ex.: Administração).
 */
export function ViewCentralProfileLink({ memberId }: { memberId: string }) {
  const memberProfile = useMemberProfileOptional();
  if (!memberProfile) return null;

  return (
    <button
      type="button"
      onClick={() => memberProfile.openMemberProfile(memberId)}
      className="text-accent w-fit text-xs font-medium hover:underline"
    >
      Ver perfil completo na Central VL6 →
    </button>
  );
}
