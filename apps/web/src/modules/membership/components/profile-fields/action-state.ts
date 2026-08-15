/**
 * Estado comum a toda action que edita um cartão de campos do Member —
 * tanto a versão de autoatendimento (`updateMyProfileAction`) quanto as
 * versões administrativas (`updateMemberProfileAction`/
 * `updateMemberIdentityAction`) devolvem esse mesmo shape, o que permite
 * os cartões em `profile-fields/` e `admin-only/` aceitarem qualquer uma
 * das duas sem precisar de uma prop de "modo".
 */
export interface ProfileFieldActionState {
  error: string | null;
}

export type ProfileFieldAction = (
  state: ProfileFieldActionState,
  formData: FormData,
) => Promise<ProfileFieldActionState>;
